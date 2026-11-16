# Measure Handles - RoboFont 4 Script
# Run this in RoboFont's Scripting Window (Python > New Script Window)
# Then click the Run button

from math import hypot
from mojo.subscriber import Subscriber, registerGlyphEditorSubscriber, unregisterGlyphEditorSubscriber

# Colors (RGBA)
RED = (1, 0, 0, 1)


class MeasureHandlesSubscriber(Subscriber):
    """
    Displays the distance between bezier handles and their anchor points.
    """
    
    debug = True  # Set to True to see debug output in the Output window
    
    def build(self):
        """Initialize the Merz layers for drawing."""
        print("MeasureHandles: build() called")
        glyphEditor = self.getGlyphEditor()
        self.container = glyphEditor.extensionContainer(
            identifier="com.measureHandles.foreground",
            location="foreground",
            clear=True
        )
        self.handlesLayer = self.container.appendBaseSublayer()
        print("MeasureHandles: layers created")
    
    def destroy(self):
        """Clean up when the subscriber is destroyed."""
        print("MeasureHandles: destroy() called")
        self.container.clearSublayers()
    
    def glyphEditorDidSetGlyph(self, info):
        """Called when a new glyph is opened in the editor."""
        print("MeasureHandles: glyphEditorDidSetGlyph called")
        self._drawHandles(info)
    
    def glyphEditorGlyphDidChangeContours(self, info):
        """Called when contours change (points moved, etc.)."""
        print("MeasureHandles: glyphEditorGlyphDidChangeContours called")
        self._drawHandles(info)
    
    def _drawHandles(self, info):
        """Draw distance measurements for all bezier handles."""
        glyph = info["glyph"]
        
        # Clear existing drawings
        self.handlesLayer.clearSublayers()
        
        if glyph is None:
            print("MeasureHandles: no glyph")
            return
        
        print(f"MeasureHandles: drawing handles for '{glyph.name}' with {len(glyph.contours)} contours")
        
        handleCount = 0
        for contour in glyph.contours:
            for bPoint in contour.bPoints:
                # Anchor position
                x0, y0 = bPoint.anchor
                
                # Incoming BCP (bezier control point)
                w1, h1 = bPoint.bcpIn
                if w1 != 0 or h1 != 0:
                    x1, y1 = x0 + w1, y0 + h1
                    dist_in = hypot(w1, h1)
                    self._drawLabel(x0, y0, x1, y1, dist_in)
                    handleCount += 1
                
                # Outgoing BCP
                w2, h2 = bPoint.bcpOut
                if w2 != 0 or h2 != 0:
                    x2, y2 = x0 + w2, y0 + h2
                    dist_out = hypot(w2, h2)
                    self._drawLabel(x0, y0, x2, y2, dist_out)
                    handleCount += 1
        
        print(f"MeasureHandles: drew {handleCount} handle labels")
    
    def _drawLabel(self, x1, y1, x2, y2, distance):
        """Draw distance label in red text."""
        # Calculate midpoint for label
        mid_x = x1 + (x2 - x1) * 0.5
        mid_y = y1 + (y2 - y1) * 0.5
        
        # Format distance text (round to 1 decimal)
        text = f"{distance:.1f}"
        
        # Draw plain red text - matching RoboFont's coordinate style
        self.handlesLayer.appendTextLineSublayer(
            position=(mid_x, mid_y),
            text=text,
            font="system",
            weight="regular",
            pointSize=9,
            fillColor=RED,
            horizontalAlignment="center",
            verticalAlignment="center",
        )


# Register the subscriber
print("MeasureHandles: Registering subscriber...")
registerGlyphEditorSubscriber(MeasureHandlesSubscriber)
print("MeasureHandles: Done! Open a glyph to see handle distances.")
print("MeasureHandles: Blue = incoming handle, Red = outgoing handle")
print("")
print("To turn OFF, run: unregisterGlyphEditorSubscriber(MeasureHandlesSubscriber)")
