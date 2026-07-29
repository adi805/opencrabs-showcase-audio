#!/usr/bin/env python3
"""
Post-render QA — validates video meets quality standards.
Checks:
  1. Duration matches target (within 0.5s)
  2. Resolution matches target
  3. Audio loudness in broadcast range (-36 to -38 dB RMS)
  4. Stream integrity — full decode check (catches corruption metadata misses)
  5. Frame count — actual decoded frames vs expected (fps × duration)
"""
import subprocess
import json
import sys
import os
from pathlib import Path


def check_duration(video_path: str, expected_seconds: float) -> str:
    """Verify video length matches target."""
    cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        actual = float(data['format']['duration'])
        if abs(actual - expected_seconds) < 0.5:
            return f'PASS: duration {actual:.2f}s (target {expected_seconds}s)'
        return f'FAIL: duration {actual:.2f}s (target {expected_seconds}s, diff {actual - expected_seconds:.2f}s)'
    except Exception as e:
        return f'ERROR: {e}'


def check_audio_loudness(video_path: str) -> str:
    """Target professional broadcast: -36 to -38 dB RMS.

    Uses ffmpeg's `volumedetect` audio filter (more reliable than
    astats via ffprobe; outputs mean_volume to stderr).
    Reference: ITU-R BS.1770 (broadcast loudness).
    """
    # First check if there's actually an audio stream
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'a',
         '-show_entries', 'stream=codec_type', '-of', 'json', video_path],
        capture_output=True, text=True, timeout=15
    )
    try:
        streams = json.loads(probe.stdout).get('streams', [])
        if not streams:
            return 'SKIP: no audio stream in file'
    except Exception:
        return 'SKIP: cannot probe audio (parse failed)'

    cmd = [
        'ffmpeg', '-hide_banner', '-nostats', '-i', video_path,
        '-af', 'volumedetect',
        '-vn', '-sn', '-dn',
        '-f', 'null', '-'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        stderr = result.stderr
        # volumedetect prints: "mean_volume: -XX.X dB"
        for line in stderr.split('\n'):
            if 'mean_volume:' in line:
                rms_str = line.split('mean_volume:')[1].strip().rstrip('dB').strip()
                rms = float(rms_str)
                if -38.0 <= rms <= -36.0:
                    return f'PASS: loudness {rms:.1f} dB (target -36 to -38 dB)'
                elif rms > -36.0:
                    return f'WARN: too loud ({rms:.1f} dB, target -36 to -38)'
                elif rms < -50.0:
                    return f'WARN: near-silent ({rms:.1f} dB, no real audio)'
                else:
                    return f'FAIL: too quiet ({rms:.1f} dB, target -36 to -38)'
        return 'SKIP: volumedetect produced no output (silent track?)'
    except subprocess.TimeoutExpired:
        return 'ERROR: ffmpeg timeout'
    except Exception as e:
        return f'ERROR: {e}'


def check_resolution(video_path: str, expected_w: int, expected_h: int) -> str:
    """Verify resolution matches target."""
    cmd = [
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height', '-of', 'json', video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        stream = data['streams'][0]
        w, h = stream['width'], stream['height']
        if w == expected_w and h == expected_h:
            return f'PASS: resolution {w}x{h}'
        return f'FAIL: resolution {w}x{h} (target {expected_w}x{expected_h})'
    except Exception as e:
        return f'ERROR: {e}'


def check_stream_integrity(video_path: str) -> str:
    """Full decode check — catches corruption that metadata-only checks miss.

    Runs `ffmpeg -v error -i file -f null -` which decodes EVERY frame.
    ANY error output = corruption (truncated streams, invalid NAL units,
    missing moov atom, etc.). This is the check that was MISSING before —
    a file can have valid duration/resolution metadata but undecodable frames.
    """
    cmd = [
        'ffmpeg', '-v', 'error', '-i', video_path,
        '-f', 'null', '-'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        errors = result.stderr.strip()
        if not errors:
            return 'PASS: full decode clean (zero errors)'
        # Count error lines for severity assessment
        error_lines = [l for l in errors.split('\n') if l.strip()]
        first_err = error_lines[0][:150] if error_lines else 'unknown'
        return f'FAIL: {len(error_lines)} decode error(s) — first: {first_err}'
    except subprocess.TimeoutExpired:
        return 'ERROR: ffmpeg decode timeout (>120s, file may be huge or corrupt)'
    except Exception as e:
        return f'ERROR: {e}'


def check_frame_count(video_path: str, expected_fps: int, expected_duration: float) -> str:
    """Count actual decoded frames vs expected (fps × duration).

    Uses ffprobe -count_frames which decodes every frame to count them.
    Catches truncated files that report correct duration in metadata
    but are missing actual frames at the end.
    """
    expected_frames = int(expected_fps * expected_duration)
    cmd = [
        'ffprobe', '-v', 'error', '-count_frames',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_read_frames',
        '-of', 'json', video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        data = json.loads(result.stdout)
        actual = int(data['streams'][0]['nb_read_frames'])
        if actual == expected_frames:
            return f'PASS: {actual} frames (expected {expected_frames})'
        elif abs(actual - expected_frames) <= 2:
            return f'WARN: {actual} frames (expected {expected_frames}, off by {actual - expected_frames})'
        return f'FAIL: {actual} frames (expected {expected_frames}, diff {actual - expected_frames})'
    except Exception as e:
        return f'ERROR: {e}'


def check_codecs(video_path: str, expected_video: str, expected_audio: str) -> str:
    """Verify codec matches target (h264/aac for web delivery)."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'stream=codec_type,codec_name',
        '-of', 'json', video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        data = json.loads(result.stdout)
        streams = data.get('streams', [])
        v_codec = next((s['codec_name'] for s in streams if s['codec_type'] == 'video'), None)
        a_codec = next((s['codec_name'] for s in streams if s['codec_type'] == 'audio'), None)

        issues = []
        if v_codec != expected_video:
            issues.append(f'video={v_codec} (want {expected_video})')
        if a_codec and a_codec != expected_audio:
            issues.append(f'audio={a_codec} (want {expected_audio})')

        if not issues:
            return f'PASS: codecs v={v_codec} a={a_codec or "none"}'
        return f'FAIL: {", ".join(issues)}'
    except Exception as e:
        return f'ERROR: {e}'


def review_render(video_path: str, reference_json: str) -> str:
    """Run full QA suite against reference profile."""
    if not os.path.exists(video_path):
        return f'ERROR: video not found: {video_path}'

    with open(reference_json) as f:
        ref = json.load(f)

    file_size_mb = os.path.getsize(video_path) / 1024 / 1024
    max_size = ref.get('max_file_size_mb', 50)
    size_status = 'PASS' if file_size_mb <= max_size else 'FAIL'

    report = [
        f'# QA Report: {video_path}',
        f'**File size:** {file_size_mb:.1f} MB ({size_status}, max {max_size} MB)',
        '',
        '## Checks',
        f'- **Duration**: {check_duration(video_path, ref["target_duration"])}',
        f'- **Resolution**: {check_resolution(video_path, ref["target_width"], ref["target_height"])}',
        f'- **Frame count**: {check_frame_count(video_path, ref.get("target_fps", 30), ref["target_duration"])}',
        f'- **Codecs**: {check_codecs(video_path, ref.get("codec", "h264"), ref.get("audio_codec", "aac"))}',
        f'- **Audio loudness**: {check_audio_loudness(video_path)}',
        f'- **Stream integrity**: {check_stream_integrity(video_path)}',
    ]

    # Summary verdict
    results = '\n'.join(report)
    fail_count = results.count('FAIL:')
    error_count = results.count('ERROR:')
    warn_count = results.count('WARN:')

    report.append('')
    if fail_count or error_count:
        report.append(f'## ❌ VERDICT: {fail_count} FAIL, {error_count} ERROR, {warn_count} WARN')
    elif warn_count:
        report.append(f'## ⚠️ VERDICT: {warn_count} WARN (usable but not perfect)')
    else:
        report.append('## ✅ VERDICT: ALL CHECKS PASSED')

    return '\n'.join(report)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: review-render.py <video.mp4> <reference.json>')
        sys.exit(1)
    print(review_render(sys.argv[1], sys.argv[2]))
