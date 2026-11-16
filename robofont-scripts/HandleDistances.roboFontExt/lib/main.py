# Handle Distances - RoboFont Extension
# Displays the distance between bezier handles and their anchor points
#
# Based on HandleLength by Johannes Breyer (Dinamo) and Gustavo Ferreira
# Original: https://github.com/johannesbreyer/HandleLength

import traceback
from AppKit import NSLog

try:
    from math import hypot
    from mojo.subscriber import Subscriber, registerGlyphEditorSubscriber

    # Color for distance labels (RGBA)
    RED = (1, 0, 0, 1)

    class HandleDistancesSubscriber(Subscriber):
        """
        Displays the distance between bezier handles and their anchor points.
        """
        
        debug = True
        
        def build(self):
            glyphEditor = self.getGlyphEditor()
            self.container = glyphEditor.extensionContainer(
                identifier="com.handleDistances.foreground",
                location="foreground",
                clear=True
            )
            self.handlesLayer = self.container.appendBaseSublayer()
        
        def destroy(self):
            self.container.clearSublayers()
        
        def glyphEditorDidSetGlyph(self, info):
            self._drawHandles(info)
        
        def glyphEditorGlyphDidChangeContours(self, info):
            self._drawHandles(info)
        
        def _drawHandles(self, info):
            glyph = info["glyph"]
            self.handlesLayer.clearSublayers()
            
            if glyph is None:
                return
            
            for contour in glyph.contours:
                for bPoint in contour.bPoints:
                    x0, y0 = bPoint.anchor
                    
                    # Incoming handle
                    w1, h1 = bPoint.bcpIn
                    if w1 != 0 or h1 != 0:
                        x1, y1 = x0 + w1, y0 + h1
                        dist = hypot(w1, h1)
                        self._drawLabel(x0, y0, x1, y1, dist)
                    
                    # Outgoing handle
                    w2, h2 = bPoint.bcpOut
                    if w2 != 0 or h2 != 0:
                        x2, y2 = x0 + w2, y0 + h2
                        dist = hypot(w2, h2)
                        self._drawLabel(x0, y0, x2, y2, dist)
        
        def _drawLabel(self, x1, y1, x2, y2, distance):
            mid_x = x1 + (x2 - x1) * 0.5
            mid_y = y1 + (y2 - y1) * 0.5
            
            text = f"{distance:.1f}"
            
            self.handlesLayer.appendTextLineSublayer(
                position=(mid_x, mid_y),
                text=text,
                font="system",
                weight="bold",
                pointSize=10,
                fillColor=RED,
                horizontalAlignment="center",
                verticalAlignment="center",
            )

    # Register when extension loads
    registerGlyphEditorSubscriber(HandleDistancesSubscriber)
    NSLog("Handle Distances extension loaded successfully")

except:
    NSLog("Handle Distances extension failed to load:\n%s" % traceback.format_exc())
