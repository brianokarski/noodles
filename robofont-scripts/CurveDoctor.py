"""
Curve Doctor — A RoboFont script for better curve drawing

Features:
- Curvature comb visualization
- BCP alignment analysis
- Inflection point detection
- Handle ratio display
- One-click curve fixes

Install: Place in RoboFont Scripts folder or run from Script window
"""

from mojo.subscriber import Subscriber, registerGlyphEditorSubscriber, unregisterGlyphEditorSubscriber
from mojo.events import postEvent
from mojo.UI import CurrentGlyphWindow
from mojo.drawingTools import *
from fontTools.misc.bezierTools import calcCubicParameters, solveQuadratic
from vanilla import FloatingWindow, CheckBox, Button, TextBox, HorizontalLine
import math


# ─────────────────────────────────────────────────────────────────────────────
# MATH UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def distance(p1, p2):
    """Euclidean distance between two points."""
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)


def lerp(p1, p2, t):
    """Linear interpolation between two points."""
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))


def angle_between(p1, p2):
    """Angle in radians from p1 to p2."""
    return math.atan2(p2[1] - p1[1], p2[0] - p1[0])


def normalize(vec):
    """Normalize a 2D vector."""
    length = math.sqrt(vec[0]**2 + vec[1]**2)
    if length < 0.0001:
        return (0, 0)
    return (vec[0] / length, vec[1] / length)


def perpendicular(vec):
    """Get perpendicular vector (90° counterclockwise)."""
    return (-vec[1], vec[0])


def cubic_point(p0, p1, p2, p3, t):
    """Evaluate cubic bezier at parameter t."""
    mt = 1 - t
    return (
        mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0],
        mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
    )


def cubic_derivative(p0, p1, p2, p3, t):
    """First derivative of cubic bezier at parameter t."""
    mt = 1 - t
    return (
        3 * mt**2 * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t**2 * (p3[0] - p2[0]),
        3 * mt**2 * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t**2 * (p3[1] - p2[1])
    )


def cubic_second_derivative(p0, p1, p2, p3, t):
    """Second derivative of cubic bezier at parameter t."""
    mt = 1 - t
    return (
        6 * mt * (p2[0] - 2*p1[0] + p0[0]) + 6 * t * (p3[0] - 2*p2[0] + p1[0]),
        6 * mt * (p2[1] - 2*p1[1] + p0[1]) + 6 * t * (p3[1] - 2*p2[1] + p1[1])
    )


def curvature_at_t(p0, p1, p2, p3, t):
    """Calculate signed curvature at parameter t."""
    d1 = cubic_derivative(p0, p1, p2, p3, t)
    d2 = cubic_second_derivative(p0, p1, p2, p3, t)
    
    # Curvature = (x'y'' - y'x'') / (x'^2 + y'^2)^(3/2)
    cross = d1[0] * d2[1] - d1[1] * d2[0]
    denom = (d1[0]**2 + d1[1]**2) ** 1.5
    
    if denom < 0.0001:
        return 0
    return cross / denom


def find_inflections(p0, p1, p2, p3):
    """Find inflection points (where curvature changes sign)."""
    # Inflection occurs where cross product of derivatives = 0
    # This is a quadratic equation in t
    
    ax = p3[0] - 3*p2[0] + 3*p1[0] - p0[0]
    ay = p3[1] - 3*p2[1] + 3*p1[1] - p0[1]
    bx = 3*p2[0] - 6*p1[0] + 3*p0[0]
    by = 3*p2[1] - 6*p1[1] + 3*p0[1]
    cx = 3*p1[0] - 3*p0[0]
    cy = 3*p1[1] - 3*p0[1]
    
    # Quadratic coefficients for inflection
    a = ax * by - ay * bx
    b = ax * cy - ay * cx
    c = bx * cy - by * cx
    
    inflections = []
    
    if abs(a) < 0.0001:
        # Linear case
        if abs(b) > 0.0001:
            t = -c / b
            if 0.01 < t < 0.99:
                inflections.append(t)
    else:
        # Quadratic case
        discriminant = b*b - 4*a*c
        if discriminant >= 0:
            sqrt_disc = math.sqrt(discriminant)
            t1 = (-b + sqrt_disc) / (2*a)
            t2 = (-b - sqrt_disc) / (2*a)
            for t in [t1, t2]:
                if 0.01 < t < 0.99:
                    inflections.append(t)
    
    return inflections


def check_handle_alignment(on_curve, bcp, prev_or_next):
    """Check if a BCP is aligned with the on-curve tangent direction."""
    if prev_or_next is None:
        return True, 0
    
    # Angle from on-curve to BCP
    angle_to_bcp = angle_between(on_curve, bcp)
    # Angle from on-curve to adjacent point
    angle_to_adj = angle_between(on_curve, prev_or_next)
    
    # For smooth points, BCP should be opposite direction (180° off)
    diff = abs(angle_to_bcp - angle_to_adj)
    # Normalize to 0-π range
    diff = min(diff, 2 * math.pi - diff)
    deviation = abs(diff - math.pi) * 180 / math.pi  # Convert to degrees
    
    is_aligned = deviation < 3  # Within 3 degrees
    return is_aligned, deviation


# ─────────────────────────────────────────────────────────────────────────────
# CURVE DOCTOR SUBSCRIBER (Visualization)
# ─────────────────────────────────────────────────────────────────────────────

class CurveDoctorSubscriber(Subscriber):
    """Draws curve analysis overlays in the glyph editor."""
    
    debug = True
    
    # Settings (controlled by UI)
    show_curvature = True
    show_inflections = True
    show_handle_issues = True
    show_handle_ratios = True
    curvature_scale = 0.5
    
    # Colors
    COLOR_CURVATURE = (0.2, 0.6, 1, 0.6)      # Blue
    COLOR_INFLECTION = (1, 0.2, 0.2, 1)        # Red
    COLOR_HANDLE_BAD = (1, 0.5, 0, 0.8)        # Orange
    COLOR_HANDLE_GOOD = (0.2, 0.8, 0.4, 0.5)   # Green
    COLOR_RATIO_TEXT = (0.5, 0.5, 0.5, 1)      # Gray
    
    def build(self):
        glyphEditor = self.getGlyphEditor()
        self.container = glyphEditor.extensionContainer(
            identifier="com.curvedoctor.overlay",
            location="foreground",
            clear=True
        )
    
    def destroy(self):
        self.container.clearSublayers()
    
    def glyphEditorDidSetGlyph(self, info):
        self.updateVisualization()
    
    def glyphEditorGlyphDidChange(self, info):
        self.updateVisualization()
    
    def updateVisualization(self):
        """Redraw all curve analysis overlays."""
        self.container.clearSublayers()
        
        glyph = self.getGlyphEditor().getGlyph()
        if glyph is None:
            return
        
        for contour in glyph:
            segments = self._get_cubic_segments(contour)
            
            for seg in segments:
                p0, p1, p2, p3 = seg['points']
                
                # Draw curvature comb
                if self.show_curvature:
                    self._draw_curvature_comb(p0, p1, p2, p3)
                
                # Mark inflection points
                if self.show_inflections:
                    self._draw_inflections(p0, p1, p2, p3)
                
                # Show handle ratios
                if self.show_handle_ratios:
                    self._draw_handle_ratios(p0, p1, p2, p3)
            
            # Check handle alignment at smooth points
            if self.show_handle_issues:
                self._check_all_handles(contour)
    
    def _get_cubic_segments(self, contour):
        """Extract cubic bezier segments from a contour."""
        segments = []
        segment_list = contour.segments
        n = len(segment_list)
        
        if n < 1:
            return segments
        
        for i, segment in enumerate(segment_list):
            # Segment is a list of points: [offcurve, offcurve, oncurve] for curves
            # Last point is always the on-curve, its .type tells us the segment type
            on_curve = segment[-1]
            off_curves = segment[:-1]
            
            if on_curve.type == 'curve' and len(off_curves) == 2:
                # Get the on-curve point of this segment (end point)
                p3 = (on_curve.x, on_curve.y)
                
                # Get the two off-curve points
                p1 = (off_curves[0].x, off_curves[0].y)
                p2 = (off_curves[1].x, off_curves[1].y)
                
                # Get previous segment's on-curve (start point)
                prev_segment = segment_list[(i - 1) % n]
                prev_on_curve = prev_segment[-1]
                p0 = (prev_on_curve.x, prev_on_curve.y)
                
                segments.append({
                    'points': (p0, p1, p2, p3),
                    'segment_index': i
                })
        
        return segments
    
    def _draw_curvature_comb(self, p0, p1, p2, p3):
        """Draw curvature comb along the curve."""
        steps = 20
        scale = self.curvature_scale * 1000  # Adjust for visibility
        
        path_layer = self.container.appendPathSublayer(
            strokeColor=self.COLOR_CURVATURE,
            strokeWidth=1,
            fillColor=None
        )
        pen = path_layer.getPen()
        
        for i in range(steps + 1):
            t = i / steps
            pt = cubic_point(p0, p1, p2, p3, t)
            k = curvature_at_t(p0, p1, p2, p3, t)
            
            # Get tangent and perpendicular
            d1 = cubic_derivative(p0, p1, p2, p3, t)
            tangent = normalize(d1)
            perp = perpendicular(tangent)
            
            # Comb tooth length proportional to curvature
            length = k * scale
            end = (pt[0] + perp[0] * length, pt[1] + perp[1] * length)
            
            pen.moveTo(pt)
            pen.lineTo(end)
        
        pen.endPath()
        
        # Draw the comb spine (connecting the tips)
        spine_layer = self.container.appendPathSublayer(
            strokeColor=(self.COLOR_CURVATURE[0], self.COLOR_CURVATURE[1], 
                        self.COLOR_CURVATURE[2], 0.3),
            strokeWidth=0.5,
            fillColor=None
        )
        spine_pen = spine_layer.getPen()
        
        first = True
        for i in range(steps + 1):
            t = i / steps
            pt = cubic_point(p0, p1, p2, p3, t)
            k = curvature_at_t(p0, p1, p2, p3, t)
            d1 = cubic_derivative(p0, p1, p2, p3, t)
            tangent = normalize(d1)
            perp = perpendicular(tangent)
            length = k * scale
            end = (pt[0] + perp[0] * length, pt[1] + perp[1] * length)
            
            if first:
                spine_pen.moveTo(end)
                first = False
            else:
                spine_pen.lineTo(end)
        
        spine_pen.endPath()
    
    def _draw_inflections(self, p0, p1, p2, p3):
        """Mark inflection points with warning symbols."""
        inflections = find_inflections(p0, p1, p2, p3)
        
        for t in inflections:
            pt = cubic_point(p0, p1, p2, p3, t)
            
            # Draw warning diamond
            size = 8
            diamond = self.container.appendPathSublayer(
                strokeColor=self.COLOR_INFLECTION,
                strokeWidth=2,
                fillColor=(1, 0.2, 0.2, 0.3)
            )
            pen = diamond.getPen()
            pen.moveTo((pt[0], pt[1] + size))
            pen.lineTo((pt[0] + size, pt[1]))
            pen.lineTo((pt[0], pt[1] - size))
            pen.lineTo((pt[0] - size, pt[1]))
            pen.closePath()
            
            # Add "!" label
            self.container.appendTextLineSublayer(
                position=(pt[0] + size + 4, pt[1] - 5),
                text="inflection",
                font="Menlo-Bold",
                pointSize=9,
                fillColor=self.COLOR_INFLECTION
            )
    
    def _draw_handle_ratios(self, p0, p1, p2, p3):
        """Show handle length ratios for curve balancing."""
        chord = distance(p0, p3)
        if chord < 1:
            return
        
        handle1 = distance(p0, p1)
        handle2 = distance(p3, p2)
        
        ratio1 = handle1 / chord
        ratio2 = handle2 / chord
        
        # Position labels near handles
        mid1 = lerp(p0, p1, 0.5)
        mid2 = lerp(p3, p2, 0.5)
        
        self.container.appendTextLineSublayer(
            position=(mid1[0] + 5, mid1[1] + 5),
            text=f"{ratio1:.0%}",
            font="Menlo",
            pointSize=9,
            fillColor=self.COLOR_RATIO_TEXT
        )
        
        self.container.appendTextLineSublayer(
            position=(mid2[0] + 5, mid2[1] + 5),
            text=f"{ratio2:.0%}",
            font="Menlo",
            pointSize=9,
            fillColor=self.COLOR_RATIO_TEXT
        )
    
    def _check_all_handles(self, contour):
        """Check handle alignment at all smooth points."""
        segment_list = contour.segments
        n = len(segment_list)
        
        for i, segment in enumerate(segment_list):
            # Last point in segment is the on-curve
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
                    
                    # Check if handles are collinear through on-curve
                    is_aligned, deviation = check_handle_alignment(on_curve, bcp_in, bcp_out)
                    
                    if not is_aligned and deviation > 5:
                        # Draw warning at the on-curve point
                        self._draw_alignment_warning(on_curve, deviation)
    
    def _draw_alignment_warning(self, pt, deviation):
        """Draw a warning indicator for misaligned handles."""
        size = 12
        
        # Orange circle
        self.container.appendOvalSublayer(
            position=(pt[0] - size/2, pt[1] - size/2),
            size=(size, size),
            strokeColor=self.COLOR_HANDLE_BAD,
            strokeWidth=2,
            fillColor=(1, 0.5, 0, 0.2)
        )
        
        # Deviation label
        self.container.appendTextLineSublayer(
            position=(pt[0] + size, pt[1] - 5),
            text=f"{deviation:.1f}°",
            font="Menlo-Bold",
            pointSize=9,
            fillColor=self.COLOR_HANDLE_BAD
        )


# ─────────────────────────────────────────────────────────────────────────────
# CURVE DOCTOR UI WINDOW
# ─────────────────────────────────────────────────────────────────────────────

class CurveDoctorWindow:
    """Floating control panel for Curve Doctor."""
    
    def __init__(self):
        self.subscriber = None
        
        self.w = FloatingWindow((220, 360), "Curve Doctor 🩺", minSize=(220, 360))
        
        y = 15
        
        # Visualization toggles
        self.w.vizLabel = TextBox((15, y, -15, 20), "Visualization", sizeStyle="small")
        y += 25
        
        self.w.showCurvature = CheckBox(
            (15, y, -15, 20), "Curvature comb",
            value=True, callback=self.updateSettings
        )
        y += 25
        
        self.w.showInflections = CheckBox(
            (15, y, -15, 20), "Inflection points",
            value=True, callback=self.updateSettings
        )
        y += 25
        
        self.w.showHandleIssues = CheckBox(
            (15, y, -15, 20), "Handle alignment",
            value=True, callback=self.updateSettings
        )
        y += 25
        
        self.w.showRatios = CheckBox(
            (15, y, -15, 20), "Handle ratios",
            value=True, callback=self.updateSettings
        )
        y += 35
        
        self.w.divider1 = HorizontalLine((15, y, -15, 1))
        y += 15
        
        # Fix buttons
        self.w.fixLabel = TextBox((15, y, -15, 20), "Quick Fixes", sizeStyle="small")
        y += 25
        
        self.w.fixInflections = Button(
            (15, y, -15, 24), "Remove Inflections",
            callback=self.removeInflections
        )
        y += 30
        
        self.w.smoothHandles = Button(
            (15, y, -15, 24), "Align Handles",
            callback=self.alignHandles
        )
        y += 30
        
        self.w.balanceHandles = Button(
            (15, y, -15, 24), "Balance Handle Lengths",
            callback=self.balanceHandles
        )
        y += 35
        
        self.w.divider2 = HorizontalLine((15, y, -15, 1))
        y += 15
        
        # Toggle button
        self.w.toggleButton = Button(
            (15, y, -15, 30), "Enable Curve Doctor",
            callback=self.toggleSubscriber
        )
        
        self.w.bind("close", self.windowClosed)
        self.w.open()
    
    def toggleSubscriber(self, sender):
        if self.subscriber is None:
            registerGlyphEditorSubscriber(CurveDoctorSubscriber)
            self.subscriber = CurveDoctorSubscriber
            sender.setTitle("Disable Curve Doctor")
        else:
            unregisterGlyphEditorSubscriber(CurveDoctorSubscriber)
            self.subscriber = None
            sender.setTitle("Enable Curve Doctor")
    
    def updateSettings(self, sender):
        if self.subscriber:
            CurveDoctorSubscriber.show_curvature = self.w.showCurvature.get()
            CurveDoctorSubscriber.show_inflections = self.w.showInflections.get()
            CurveDoctorSubscriber.show_handle_issues = self.w.showHandleIssues.get()
            CurveDoctorSubscriber.show_handle_ratios = self.w.showRatios.get()
            # Trigger redraw
            postEvent("Curve Doctor Settings Changed")
    
    def removeInflections(self, sender):
        """Report inflection points (splitting is complex)."""
        from mojo.UI import CurrentGlyphWindow
        window = CurrentGlyphWindow()
        if window is None:
            return
        
        glyph = window.getGlyph()
        if glyph is None:
            return
        
        inflection_count = 0
        for contour in glyph:
            segment_list = contour.segments
            n = len(segment_list)
            
            for i, segment in enumerate(segment_list):
                on_curve = segment[-1]
                off_curves = segment[:-1]
                
                if on_curve.type == 'curve' and len(off_curves) == 2:
                    p3 = (on_curve.x, on_curve.y)
                    p1 = (off_curves[0].x, off_curves[0].y)
                    p2 = (off_curves[1].x, off_curves[1].y)
                    prev_segment = segment_list[(i - 1) % n]
                    prev_on_curve = prev_segment[-1]
                    p0 = (prev_on_curve.x, prev_on_curve.y)
                    
                    inflections = find_inflections(p0, p1, p2, p3)
                    inflection_count += len(inflections)
        
        if inflection_count > 0:
            print(f"⚠️ Found {inflection_count} inflection point(s). Split curves manually at the marked locations.")
        else:
            print("✅ No inflection points found!")
    
    def alignHandles(self, sender):
        """Align BCPs at smooth points."""
        from mojo.UI import CurrentGlyphWindow
        window = CurrentGlyphWindow()
        if window is None:
            return
        
        glyph = window.getGlyph()
        if glyph is None:
            return
        
        glyph.prepareUndo("Align Handles")
        
        for contour in glyph:
            segment_list = contour.segments
            n = len(segment_list)
            
            for i, segment in enumerate(segment_list):
                pt = segment[-1]  # On-curve is last point
                off_curves = segment[:-1]
                
                if pt.smooth and off_curves:
                    on_curve = (pt.x, pt.y)
                    
                    # Get incoming handle (last off-curve of this segment)
                    bcp_in = off_curves[-1]
                    
                    # Get outgoing handle (first off-curve of next segment)
                    next_segment = segment_list[(i + 1) % n]
                    next_off_curves = next_segment[:-1]
                    
                    if next_off_curves:
                        bcp_out = next_off_curves[0]
                        
                        # Calculate angle from incoming handle
                        angle_in = angle_between(on_curve, (bcp_in.x, bcp_in.y))
                        
                        # Keep handle lengths
                        len_out = distance(on_curve, (bcp_out.x, bcp_out.y))
                        
                        # Reposition outgoing handle opposite to incoming
                        bcp_out.x = pt.x + math.cos(angle_in + math.pi) * len_out
                        bcp_out.y = pt.y + math.sin(angle_in + math.pi) * len_out
        
        glyph.changed()
        print("✅ Handles aligned at smooth points")
    
    def balanceHandles(self, sender):
        """Balance handle lengths to 1/3 of chord (ideal for quarter circles)."""
        from mojo.UI import CurrentGlyphWindow
        window = CurrentGlyphWindow()
        if window is None:
            return
        
        glyph = window.getGlyph()
        if glyph is None:
            return
        
        glyph.prepareUndo("Balance Handles")
        
        for contour in glyph:
            segment_list = contour.segments
            n = len(segment_list)
            
            for i, segment in enumerate(segment_list):
                on_curve = segment[-1]
                off_curves = segment[:-1]
                
                if on_curve.type == 'curve' and len(off_curves) == 2:
                    # Get segment points
                    p3 = (on_curve.x, on_curve.y)
                    prev_segment = segment_list[(i - 1) % n]
                    prev_on_curve = prev_segment[-1]
                    p0 = (prev_on_curve.x, prev_on_curve.y)
                    
                    p1 = off_curves[0]
                    p2 = off_curves[1]
                    
                    # Calculate ideal handle length (≈1/3 chord for smooth curves)
                    chord = distance(p0, p3)
                    if chord < 1:
                        continue
                    
                    ideal_ratio = 0.33
                    ideal_len = chord * ideal_ratio
                    
                    # Adjust handle lengths while keeping angles
                    angle1 = angle_between(p0, (p1.x, p1.y))
                    angle2 = angle_between(p3, (p2.x, p2.y))
                    
                    p1.x = p0[0] + math.cos(angle1) * ideal_len
                    p1.y = p0[1] + math.sin(angle1) * ideal_len
                    p2.x = p3[0] + math.cos(angle2) * ideal_len
                    p2.y = p3[1] + math.sin(angle2) * ideal_len
        
        glyph.changed()
        print("✅ Handles balanced to 33% of chord length")
    
    def windowClosed(self, sender):
        if self.subscriber:
            unregisterGlyphEditorSubscriber(CurveDoctorSubscriber)


# ─────────────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────────────

CurveDoctorWindow()

