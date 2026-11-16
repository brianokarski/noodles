"""
Curve Analysis — Quick diagnostic report for current glyph

Run this script to get a printed analysis of all curve issues
in the current glyph without any visual overlays.
"""

from mojo.UI import CurrentGlyphWindow
import math


def distance(p1, p2):
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)


def angle_between(p1, p2):
    return math.atan2(p2[1] - p1[1], p2[0] - p1[0])


def find_inflections(p0, p1, p2, p3):
    """Find inflection points in a cubic bezier."""
    ax = p3[0] - 3*p2[0] + 3*p1[0] - p0[0]
    ay = p3[1] - 3*p2[1] + 3*p1[1] - p0[1]
    bx = 3*p2[0] - 6*p1[0] + 3*p0[0]
    by = 3*p2[1] - 6*p1[1] + 3*p0[1]
    cx = 3*p1[0] - 3*p0[0]
    cy = 3*p1[1] - 3*p0[1]
    
    a = ax * by - ay * bx
    b = ax * cy - ay * cx
    c = bx * cy - by * cx
    
    inflections = []
    
    if abs(a) < 0.0001:
        if abs(b) > 0.0001:
            t = -c / b
            if 0.01 < t < 0.99:
                inflections.append(t)
    else:
        discriminant = b*b - 4*a*c
        if discriminant >= 0:
            sqrt_disc = math.sqrt(discriminant)
            t1 = (-b + sqrt_disc) / (2*a)
            t2 = (-b - sqrt_disc) / (2*a)
            for t in [t1, t2]:
                if 0.01 < t < 0.99:
                    inflections.append(t)
    
    return inflections


def cubic_point(p0, p1, p2, p3, t):
    mt = 1 - t
    return (
        mt**3 * p0[0] + 3*mt**2*t * p1[0] + 3*mt*t**2 * p2[0] + t**3 * p3[0],
        mt**3 * p0[1] + 3*mt**2*t * p1[1] + 3*mt*t**2 * p2[1] + t**3 * p3[1]
    )


def analyze_glyph(glyph):
    """Analyze all curves in a glyph and return issues."""
    issues = []
    stats = {
        'total_curves': 0,
        'inflections': 0,
        'misaligned_handles': 0,
        'short_handles': 0,
        'long_handles': 0
    }
    
    for contour_idx, contour in enumerate(glyph):
        segment_list = contour.segments
        n = len(segment_list)
        
        # Analyze cubic segments
        for segment_idx, segment in enumerate(segment_list):
            # Segment is a list: [offcurve, offcurve, oncurve] for curves
            on_curve = segment[-1]
            off_curves = segment[:-1]
            
            if on_curve.type == 'curve' and len(off_curves) == 2:
                stats['total_curves'] += 1
                
                p3 = (on_curve.x, on_curve.y)
                p1 = (off_curves[0].x, off_curves[0].y)
                p2 = (off_curves[1].x, off_curves[1].y)
                
                prev_segment = segment_list[(segment_idx - 1) % n]
                prev_on_curve = prev_segment[-1]
                p0 = (prev_on_curve.x, prev_on_curve.y)
                
                # Check for inflections
                inflections = find_inflections(p0, p1, p2, p3)
                if inflections:
                    stats['inflections'] += len(inflections)
                    for t in inflections:
                        inf_pt = cubic_point(p0, p1, p2, p3, t)
                        issues.append({
                            'type': 'inflection',
                            'severity': 'warning',
                            'contour': contour_idx,
                            'segment': segment_idx,
                            'position': inf_pt,
                            'message': f"Inflection point at t={t:.2f}"
                        })
                
                # Check handle ratios
                chord = distance(p0, p3)
                if chord > 1:
                    handle1_len = distance(p0, p1)
                    handle2_len = distance(p3, p2)
                    ratio1 = handle1_len / chord
                    ratio2 = handle2_len / chord
                    
                    # Ideal is around 0.33 (1/3) for quarter circles
                    # Flag if very short (<0.1) or very long (>0.6)
                    if ratio1 < 0.1 or ratio2 < 0.1:
                        stats['short_handles'] += 1
                        issues.append({
                            'type': 'short_handle',
                            'severity': 'info',
                            'contour': contour_idx,
                            'segment': segment_idx,
                            'message': f"Very short handle ({min(ratio1, ratio2):.0%} of chord)"
                        })
                    
                    if ratio1 > 0.6 or ratio2 > 0.6:
                        stats['long_handles'] += 1
                        issues.append({
                            'type': 'long_handle',
                            'severity': 'info',
                            'contour': contour_idx,
                            'segment': segment_idx,
                            'message': f"Very long handle ({max(ratio1, ratio2):.0%} of chord)"
                        })
        
        # Check handle alignment at smooth points
        for i, segment in enumerate(segment_list):
            # Segment is a list: last point is on-curve
            pt = segment[-1]
            off_curves = segment[:-1]
            
            if pt.smooth and off_curves:
                on_curve = (pt.x, pt.y)
                
                # Get incoming handle (last off-curve of this segment)
                bcp_in = (off_curves[-1].x, off_curves[-1].y)
                
                # Get outgoing handle (first off-curve of next segment)
                next_segment = segment_list[(i + 1) % n]
                next_off_curves = next_segment[:-1]
                
                if next_off_curves:
                    bcp_out = (next_off_curves[0].x, next_off_curves[0].y)
                    
                    angle_in = angle_between(on_curve, bcp_in)
                    angle_out = angle_between(on_curve, bcp_out)
                    
                    diff = abs(angle_in - angle_out)
                    diff = min(diff, 2 * math.pi - diff)
                    deviation = abs(diff - math.pi) * 180 / math.pi
                    
                    if deviation > 3:
                        stats['misaligned_handles'] += 1
                        issues.append({
                            'type': 'misaligned',
                            'severity': 'warning' if deviation > 10 else 'info',
                            'contour': contour_idx,
                            'position': on_curve,
                            'message': f"Handle misalignment: {deviation:.1f}°"
                        })
    
    return issues, stats


def print_report(glyph_name, issues, stats):
    """Print a formatted analysis report."""
    print("\n" + "=" * 50)
    print(f"  CURVE ANALYSIS: /{glyph_name}")
    print("=" * 50)
    
    print(f"\n📊 Summary:")
    print(f"   Total curve segments: {stats['total_curves']}")
    print(f"   Inflection points:    {stats['inflections']}")
    print(f"   Misaligned handles:   {stats['misaligned_handles']}")
    print(f"   Short handles (<10%): {stats['short_handles']}")
    print(f"   Long handles (>60%):  {stats['long_handles']}")
    
    if not issues:
        print("\n✅ No issues found! Curves look good.")
    else:
        print(f"\n⚠️  Issues ({len(issues)}):\n")
        
        for issue in issues:
            icon = "🔴" if issue['severity'] == 'warning' else "🟡"
            loc = f"contour {issue['contour']}"
            if 'segment' in issue:
                loc += f", segment {issue['segment']}"
            if 'position' in issue:
                pos = issue['position']
                loc += f" @ ({pos[0]:.0f}, {pos[1]:.0f})"
            
            print(f"   {icon} [{loc}]")
            print(f"      {issue['message']}")
            print()
    
    print("-" * 50 + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────────────

window = CurrentGlyphWindow()
if window:
    glyph = window.getGlyph()
    if glyph:
        issues, stats = analyze_glyph(glyph)
        print_report(glyph.name, issues, stats)
    else:
        print("⚠️ No glyph in current window")
else:
    print("⚠️ No glyph window open")

