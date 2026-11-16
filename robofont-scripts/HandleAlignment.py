# Handle Alignment Checker - RoboFont 4 Script
# Shows if handles are aligned with adjacent line segments
# Run this in RoboFont's Scripting Window
#
# Green = aligned (within tolerance)
# Red = misaligned (shows angle difference)

from math import hypot, atan2, degrees, pi
from mojo.subscriber import Subscriber, registerGlyphEditorSubscriber, unregisterGlyphEditorSubscriber

# Colors (RGBA) - using blue tones to distinguish from handle distances
ALIGNED = (0, 0.6, 0.9, 1)      # Blue = aligned
SLIGHTLY_OFF = (0.6, 0.4, 1, 1)  # Purple = slightly off
MISALIGNED = (1, 0, 0.6, 1)      # Magenta = misaligned

# Tolerance in degrees - handles within this are considered "aligned"
ANGLE_TOLERANCE = 1.0


def get_angle(x1, y1, x2, y2):
    """Get angle in degrees between two points."""
    return degrees(atan2(y2 - y1, x2 - x1))


def normalize_angle(angle):
    """Normalize angle to 0-180 range for comparison (ignoring direction)."""
    angle = angle % 360
    if angle > 180:
        angle = 360 - angle
    return angle


def angle_difference(a1, a2):
    """
    Get how far off from collinear two angles are.
    Both 0° and 180° difference = aligned (on the same line).
    90° = maximum misalignment (perpendicular).
    """
    diff = abs(a1 - a2) % 360
    if diff > 180:
        diff = 360 - diff
    # Treat opposite direction (180°) as aligned too - it's still collinear
    if diff > 90:
        diff = 180 - diff
    return diff


class HandleAlignmentSubscriber(Subscriber):
    """
    Checks if bezier handles are aligned with adjacent line segments.
    """
    
    debug = True
    
    def build(self):
        print("HandleAlignment: build() called")
        glyphEditor = self.getGlyphEditor()
        self.container = glyphEditor.extensionContainer(
            identifier="com.handleAlignment.foreground",
            location="foreground",
            clear=True
        )
        self.alignmentLayer = self.container.appendBaseSublayer()
        print("HandleAlignment: layers created")
    
    def destroy(self):
        print("HandleAlignment: destroy() called")
        self.container.clearSublayers()
    
    def glyphEditorDidSetGlyph(self, info):
        self._checkAlignment(info)
    
    def glyphEditorGlyphDidChangeContours(self, info):
        self._checkAlignment(info)
    
    def _checkAlignment(self, info):
        glyph = info["glyph"]
        self.alignmentLayer.clearSublayers()
        
        if glyph is None:
            return
        
        for contour in glyph:
            segments = list(contour.segments)
            numSegments = len(segments)
            
            for i, segment in enumerate(segments):
                prevSegment = segments[i - 1]
                nextSegment = segments[(i + 1) % numSegments]
                
                # Get the on-curve point at the end of this segment
                if segment.onCurve is None:
                    continue
                    
                currentPt = (segment.onCurve.x, segment.onCurve.y)
                
                # Check: Is current segment a LINE and next is a CURVE?
                # The outgoing handle of the curve should align with the line
                if segment.type == "line" and nextSegment.type == "curve":
                    # Get the start of the line (previous segment's endpoint)
                    if prevSegment.onCurve:
                        linePt = (prevSegment.onCurve.x, prevSegment.onCurve.y)
                        lineAngle = get_angle(linePt[0], linePt[1], currentPt[0], currentPt[1])
                        
                        # The first off-curve point of the next curve is the outgoing handle
                        if len(nextSegment.points) >= 1:
                            handle = nextSegment.points[0]
                            handleAngle = get_angle(currentPt[0], currentPt[1], handle.x, handle.y)
                            
                            diff = angle_difference(lineAngle, handleAngle)
                            # Debug: print the angles
                            print(f"LINE→CURVE at ({currentPt[0]:.0f}, {currentPt[1]:.0f}): lineAngle={lineAngle:.1f}°, handleAngle={handleAngle:.1f}°, diff={diff:.1f}°")
                            self._drawAlignmentIndicator(currentPt, (handle.x, handle.y), diff, "out")
                
                # Check: Is current segment a CURVE and next is a LINE?
                # The incoming handle of the curve should align with the NEXT line
                if segment.type == "curve" and nextSegment.type == "line":
                    # Get the angle of the NEXT line (from currentPt to nextSegment's end)
                    if nextSegment.onCurve:
                        nextPt = (nextSegment.onCurve.x, nextSegment.onCurve.y)
                        lineAngle = get_angle(currentPt[0], currentPt[1], nextPt[0], nextPt[1])
                        
                        # The last off-curve point before onCurve is the incoming handle
                        if len(segment.points) >= 2:
                            handle = segment.points[-2]  # Second to last point is the incoming handle
                            handleAngle = get_angle(handle.x, handle.y, currentPt[0], currentPt[1])
                            
                            diff = angle_difference(lineAngle, handleAngle)
                            # Debug: print the angles
                            print(f"CURVE→LINE at ({currentPt[0]:.0f}, {currentPt[1]:.0f}): lineAngle={lineAngle:.1f}°, handleAngle={handleAngle:.1f}°, diff={diff:.1f}°")
                            self._drawAlignmentIndicator((handle.x, handle.y), currentPt, diff, "in")
    
    def _drawAlignmentIndicator(self, pt1, pt2, angleDiff, direction):
        """Draw alignment indicator next to the off-curve handle point."""
        from math import cos, sin, radians
        
        # Position at the off-curve point (pt2 is the handle)
        handle_x, handle_y = pt2
        
        # Get angle of handle and offset perpendicular to it
        angle = get_angle(pt1[0], pt1[1], pt2[0], pt2[1])
        perp_angle = angle + 90  # Perpendicular
        
        # Offset distance from handle
        offset = 20
        offset_x = cos(radians(perp_angle)) * offset
        offset_y = sin(radians(perp_angle)) * offset
        
        # Choose color based on alignment
        if angleDiff <= ANGLE_TOLERANCE:
            color = ALIGNED
            text = "OK"
        elif angleDiff <= 5:
            color = SLIGHTLY_OFF
            text = f"{angleDiff:.1f}°"
        else:
            color = MISALIGNED
            text = f"{angleDiff:.1f}°"
        
        # Draw at the handle point, offset perpendicular to the handle direction
        # Matching RoboFont's coordinate style
        self.alignmentLayer.appendTextLineSublayer(
            position=(handle_x + offset_x, handle_y + offset_y),
            text=text,
            font="system",
            weight="regular",
            pointSize=9,
            fillColor=color,
            horizontalAlignment="center",
            verticalAlignment="center",
        )


# Register the subscriber
print("HandleAlignment: Registering subscriber...")
registerGlyphEditorSubscriber(HandleAlignmentSubscriber)
print("HandleAlignment: Done! Open a glyph to check handle alignment.")
print("HandleAlignment: Blue 'OK' = aligned, Purple/Magenta = degrees off")
print("")
print("To turn OFF, run: unregisterGlyphEditorSubscriber(HandleAlignmentSubscriber)")
