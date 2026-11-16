"use strict";
/**
 * Moth Figma Plugin (Compiled - ES5 Compatible)
 */

var lastSpec = null;

figma.showUI(__html__, { 
  width: 400, 
  height: 580,
  themeColors: true 
});

if (figma.command === 'execute-last' && lastSpec) {
  executeSpec(lastSpec);
} else if (figma.command === 'sync-variables') {
  figma.ui.postMessage({ type: 'request-variables' });
}

figma.ui.onmessage = function(msg) {
  switch (msg.type) {
    case 'execute-spec':
      lastSpec = msg.spec;
      executeSpec(msg.spec);
      break;
    case 'create-frame':
      createFrame(msg.spec);
      break;
    case 'sync-variables':
      syncVariables(msg.variables);
      break;
    case 'apply-effect':
      applyTextEffect(msg.effect, msg.options);
      break;
    case 'apply-scatter':
      applyScatterEffect(msg.options);
      break;
    case 'apply-translation':
      applyTranslationEffect(msg.options);
      break;
    case 'apply-text-on-path':
      applyTextOnPath(msg.options);
      break;
    case 'get-selection':
      var selection = figma.currentPage.selection;
      figma.ui.postMessage({ 
        type: 'selection', 
        nodes: selection.map(function(n) { return { id: n.id, name: n.name, type: n.type }; })
      });
      break;
    case 'save-api-key':
      figma.clientStorage.setAsync('moth_api_key', msg.key).then(function() {
        // Key saved silently
      });
      break;
    case 'load-api-key':
      figma.clientStorage.getAsync('moth_api_key').then(function(key) {
        if (key) {
          figma.ui.postMessage({ type: 'api-key-loaded', key: key });
        }
      });
      break;
    case 'close':
      figma.closePlugin();
      break;
  }
};

function executeSpec(spec) {
  figma.notify('🦋 Moth is designing...');
  figma.ui.postMessage({ type: 'status', text: 'Executing...', connected: false });
  
  createNode(spec).then(function(node) {
    if (node) {
      var viewport = figma.viewport.center;
      var posX = (spec.position && spec.position.x !== undefined) ? spec.position.x : (viewport.x - (node.width / 2));
      var posY = (spec.position && spec.position.y !== undefined) ? spec.position.y : (viewport.y - (node.height / 2));
      node.x = posX;
      node.y = posY;
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      figma.notify('✓ Design created!');
      figma.ui.postMessage({ type: 'status', text: 'Ready to design', connected: true });
    }
  }).catch(function(error) {
    figma.notify('Error: ' + error, { error: true });
    figma.ui.postMessage({ type: 'status', text: 'Error occurred', connected: false });
  });
}

function createNode(spec) {
  if (spec.text && !spec.children) {
    return createText(spec.text);
  }
  switch (spec.type) {
    case 'frame':
    case 'section':
    case 'page':
      return createFrame(spec);
    case 'component':
      return createComponent(spec);
    default:
      return createFrame(spec);
  }
}

function createFrame(spec) {
  return new Promise(function(resolve) {
    var frame = figma.createFrame();
    frame.name = spec.name || 'Frame';

    // Check if any children use absolute positioning
    var hasAbsoluteChildren = spec.children && spec.children.some(function(c) {
      return c.position && (c.position.x !== undefined || c.position.y !== undefined);
    });

    // Only apply auto-layout if no children use absolute positioning
    if (spec.autoLayout && !hasAbsoluteChildren) {
      applyAutoLayout(frame, spec.autoLayout);
    }

    if (spec.size) {
      if (typeof spec.size.width === 'number') {
        frame.resize(spec.size.width, frame.height);
      }
      if (typeof spec.size.height === 'number') {
        frame.resize(frame.width, spec.size.height);
      }
    }

    // Allow spec to control clipping, default to true (Figma default)
    if (spec.clipsContent !== undefined) {
      frame.clipsContent = spec.clipsContent;
    }

    if (spec.fills) {
      createFills(spec.fills).then(function(fills) {
        frame.fills = fills;
      });
    }

    if (spec.strokes) {
      createStrokes(spec.strokes).then(function(strokes) {
        frame.strokes = strokes;
        var weight = (spec.strokes[0] && spec.strokes[0].weight) ? spec.strokes[0].weight : 1;
        frame.strokeWeight = weight;
      });
    }

    if (spec.effects) {
      frame.effects = createEffects(spec.effects);
    }

    if (spec.cornerRadius) {
      if (typeof spec.cornerRadius === 'number') {
        frame.cornerRadius = spec.cornerRadius;
      } else {
        frame.topLeftRadius = spec.cornerRadius.topLeft;
        frame.topRightRadius = spec.cornerRadius.topRight;
        frame.bottomRightRadius = spec.cornerRadius.bottomRight;
        frame.bottomLeftRadius = spec.cornerRadius.bottomLeft;
      }
    }

    var childPromises = [];
    
    if (spec.children) {
      spec.children.forEach(function(childSpec) {
        var p = createNode(childSpec).then(function(child) {
          if (child) {
            frame.appendChild(child);
            
            // Apply absolute positioning if specified
            if (childSpec.position) {
              if (childSpec.position.x !== undefined) {
                child.x = childSpec.position.x;
              }
              if (childSpec.position.y !== undefined) {
                child.y = childSpec.position.y;
              }
            }
            
            // Apply size constraints for absolute positioned elements
            if (childSpec.size && !spec.autoLayout) {
              if (typeof childSpec.size.width === 'number' && child.resize) {
                child.resize(childSpec.size.width, child.height);
              }
              if (typeof childSpec.size.height === 'number' && child.resize) {
                child.resize(child.width, childSpec.size.height);
              }
            }
            
            if (spec.autoLayout && childSpec.size && childSpec.size.width === 'FILL') {
              child.layoutGrow = 1;
            }
          }
        });
        childPromises.push(p);
      });
    }

    if (spec.text && !spec.children) {
      var textPromise = createText(spec.text).then(function(text) {
        frame.appendChild(text);
      });
      childPromises.push(textPromise);
    }

    Promise.all(childPromises).then(function() {
      resolve(frame);
    });
  });
}

function createComponent(spec) {
  return new Promise(function(resolve) {
    if (spec.componentKey) {
      figma.importComponentByKeyAsync(spec.componentKey).then(function(component) {
        var instance = component.createInstance();
        instance.name = spec.name;
        if (spec.overrides) {
          applyOverrides(instance, spec.overrides);
        }
        resolve(instance);
      }).catch(function() {
        figma.notify('Component not found: ' + spec.componentKey, { error: true });
        resolve(null);
      });
      return;
    }

    var component = figma.createComponent();
    component.name = spec.name;

    if (spec.autoLayout) {
      applyAutoLayout(component, spec.autoLayout);
    }

    if (spec.fills) {
      createFills(spec.fills).then(function(fills) {
        component.fills = fills;
      });
    }

    if (spec.cornerRadius && typeof spec.cornerRadius === 'number') {
      component.cornerRadius = spec.cornerRadius;
    }

    var childPromises = [];
    if (spec.children) {
      spec.children.forEach(function(childSpec) {
        var p = createNode(childSpec).then(function(child) {
          if (child) {
            component.appendChild(child);
          }
        });
        childPromises.push(p);
      });
    }

    Promise.all(childPromises).then(function() {
      resolve(component);
    });
  });
}

function createText(spec) {
  return new Promise(function(resolve) {
    var text = figma.createText();
    var fontFamily = spec.fontFamily || 'Inter';
    var fontWeight = spec.fontWeight || 400;
    var fontStyle = 'Regular';
    
    if (fontWeight >= 700) fontStyle = 'Bold';
    else if (fontWeight >= 600) fontStyle = 'Semi Bold';
    else if (fontWeight >= 500) fontStyle = 'Medium';
    
    figma.loadFontAsync({ family: fontFamily, style: fontStyle }).then(function() {
      text.fontName = { family: fontFamily, style: fontStyle };
      finishText();
    }).catch(function() {
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }).then(function() {
        text.fontName = { family: 'Inter', style: 'Regular' };
        finishText();
      });
    });

    function finishText() {
      text.characters = spec.characters || 'Text';

      if (spec.fontSize) {
        text.fontSize = spec.fontSize;
      }

      if (spec.lineHeight) {
        if (typeof spec.lineHeight === 'number') {
          text.lineHeight = { value: spec.lineHeight, unit: 'PIXELS' };
        } else {
          text.lineHeight = spec.lineHeight;
        }
      }

      if (spec.letterSpacing) {
        text.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
      }

      if (spec.textAlignHorizontal) {
        text.textAlignHorizontal = spec.textAlignHorizontal;
      }

      if (spec.fills) {
        createFills(spec.fills).then(function(fills) {
          text.fills = fills;
          resolve(text);
        });
      } else {
        resolve(text);
      }
    }
  });
}

function applyAutoLayout(frame, spec) {
  frame.layoutMode = spec.mode || 'VERTICAL';
  frame.itemSpacing = spec.gap || 0;

  if (spec.paddingTop !== undefined) frame.paddingTop = spec.paddingTop;
  if (spec.paddingRight !== undefined) frame.paddingRight = spec.paddingRight;
  if (spec.paddingBottom !== undefined) frame.paddingBottom = spec.paddingBottom;
  if (spec.paddingLeft !== undefined) frame.paddingLeft = spec.paddingLeft;

  if (spec.primaryAxisAlignItems) {
    frame.primaryAxisAlignItems = spec.primaryAxisAlignItems;
  }

  if (spec.counterAxisAlignItems) {
    frame.counterAxisAlignItems = spec.counterAxisAlignItems;
  }

  if (spec.primaryAxisSizingMode) {
    frame.primaryAxisSizingMode = spec.primaryAxisSizingMode;
  }

  if (spec.counterAxisSizingMode) {
    frame.counterAxisSizingMode = spec.counterAxisSizingMode;
  }

  if (spec.wrap) {
    frame.layoutWrap = 'WRAP';
  }
}

function createFills(specs) {
  return new Promise(function(resolve) {
    var fills = [];
    specs.forEach(function(spec) {
      if (spec.type === 'SOLID') {
        var color = spec.color || { r: 0, g: 0, b: 0 };
        var opacity = spec.opacity !== undefined ? spec.opacity : 1;
        var fill = {
          type: 'SOLID',
          color: color,
          opacity: opacity
        };
        fills.push(fill);
      } else if (spec.type === 'GRADIENT_LINEAR' && spec.gradientStops) {
        var gradient = {
          type: 'GRADIENT_LINEAR',
          gradientStops: spec.gradientStops.map(function(stop) {
            return {
              position: stop.position,
              color: { r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a || 1 }
            };
          }),
          gradientTransform: [[1, 0, 0], [0, 1, 0]]
        };
        fills.push(gradient);
      }
    });
    resolve(fills);
  });
}

function createStrokes(specs) {
  return new Promise(function(resolve) {
    var strokes = specs.map(function(spec) {
      return {
        type: 'SOLID',
        color: spec.color || { r: 0, g: 0, b: 0 }
      };
    });
    resolve(strokes);
  });
}

function createEffects(specs) {
  return specs.map(function(spec) {
    var alpha = (spec.color && spec.color.a !== undefined) ? spec.color.a : 0.1;
    return {
      type: spec.type,
      color: { r: spec.color.r, g: spec.color.g, b: spec.color.b, a: alpha },
      offset: spec.offset,
      radius: spec.radius,
      spread: spec.spread || 0,
      visible: true,
      blendMode: 'NORMAL'
    };
  });
}

function syncVariables(variables) {
  figma.notify('Syncing variables...');
  
  var collections = figma.variables.getLocalVariableCollections();
  var collection = null;
  
  for (var i = 0; i < collections.length; i++) {
    if (collections[i].name === 'Moth Tokens') {
      collection = collections[i];
      break;
    }
  }

  if (!collection) {
    collection = figma.variables.createVariableCollection('Moth Tokens');
  }

  var modeId = collection.modes[0].modeId;
  var flatVars = flattenVariables(variables, '');

  var keys = Object.keys(flatVars);
  keys.forEach(function(name) {
    var value = flatVars[name];
    var existingVars = figma.variables.getLocalVariables();
    var variable = null;
    
    for (var i = 0; i < existingVars.length; i++) {
      if (existingVars[i].name === name && existingVars[i].variableCollectionId === collection.id) {
        variable = existingVars[i];
        break;
      }
    }

    if (!variable) {
      var resolvedType = (typeof value === 'string' && value.charAt(0) === '#') ? 'COLOR' : 'FLOAT';
      variable = figma.variables.createVariable(name, collection, resolvedType);
    }

    if (variable.resolvedType === 'COLOR' && typeof value === 'string') {
      variable.setValueForMode(modeId, hexToRgb(value));
    } else if (variable.resolvedType === 'FLOAT' && typeof value === 'number') {
      variable.setValueForMode(modeId, value);
    }
  });

  figma.notify('✓ Variables synced!');
}

function flattenVariables(obj, prefix) {
  var result = {};
  var keys = Object.keys(obj);
  
  keys.forEach(function(key) {
    if (key.charAt(0) === '$') return;
    
    var value = obj[key];
    var path = prefix ? (prefix + '/' + key) : key;
    
    if (typeof value === 'object' && value !== null && value.$value !== undefined) {
      result[path] = value.$value;
    } else if (typeof value === 'object' && value !== null) {
      var nested = flattenVariables(value, path);
      var nestedKeys = Object.keys(nested);
      nestedKeys.forEach(function(k) {
        result[k] = nested[k];
      });
    }
  });
  
  return result;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16) / 255,
    g: parseInt(hex.substring(2, 4), 16) / 255,
    b: parseInt(hex.substring(4, 6), 16) / 255
  };
}

function applyOverrides(instance, overrides) {
  var keys = Object.keys(overrides);
  keys.forEach(function(key) {
    var value = overrides[key];
    var child = instance.findOne(function(n) { return n.name === key; });
    if (child && child.type === 'TEXT' && typeof value === 'string') {
      child.characters = value;
    }
  });
}

// ========================================================================
// Text Effects
// ========================================================================

function applyTextEffect(effectType, options) {
  var selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('⚠ Select a text layer first', { error: true });
    figma.ui.postMessage({ type: 'status', text: 'No selection', connected: false });
    return;
  }

  var textNodes = selection.filter(function(n) { return n.type === 'TEXT'; });
  
  if (textNodes.length === 0) {
    figma.notify('⚠ No text layers in selection', { error: true });
    figma.ui.postMessage({ type: 'status', text: 'Select text layer', connected: false });
    return;
  }

  figma.notify('🦋 Applying effect...');

  var promises = textNodes.map(function(textNode) {
    return applyEffectToText(textNode as TextNode, effectType, options);
  });

  Promise.all(promises).then(function() {
    figma.notify('✓ Effect applied!');
    figma.ui.postMessage({ type: 'status', text: 'Ready', connected: true });
  }).catch(function(error) {
    figma.notify('Error: ' + error, { error: true });
    figma.ui.postMessage({ type: 'status', text: 'Error', connected: false });
  });
}

function applyEffectToText(textNode: TextNode, effectType, options) {
  return new Promise(function(resolve, reject) {
    var text = textNode.characters;
    var length = text.length;

    // Load all fonts that might be needed
    var fontsToLoad = [];
    
    // Get current font
    var currentFont = textNode.fontName;
    if (currentFont !== figma.mixed) {
      fontsToLoad.push(currentFont);
    }

    // Add alt font if needed
    if (effectType === 'alternateFont' || effectType === 'glitch') {
      fontsToLoad.push({ family: options.altFont, style: 'Regular' });
      fontsToLoad.push({ family: options.altFont, style: 'Bold' });
    }

    // Load Inter as fallback
    fontsToLoad.push({ family: 'Inter', style: 'Regular' });

    var loadPromises = fontsToLoad.map(function(font) {
      return figma.loadFontAsync(font as FontName).catch(function() {
        // Font load failed, continue anyway
      });
    });

    Promise.all(loadPromises).then(function() {
      switch (effectType) {
        case 'alternateCase':
          applyAlternateCase(textNode);
          break;
        case 'alternateColor':
          applyAlternateColor(textNode, options.color1, options.color2);
          break;
        case 'alternateFont':
          applyAlternateFont(textNode, options.altFont);
          break;
        case 'randomCase':
          applyRandomCase(textNode);
          break;
        case 'rainbow':
          applyRainbow(textNode);
          break;
        case 'gradient':
          applyGradient(textNode, options.color1, options.color2);
          break;
        case 'wave':
          applyWaveSize(textNode);
          break;
        case 'glitch':
          applyGlitch(textNode, options);
          break;
      }
      resolve(true);
    }).catch(reject);
  });
}

function applyAlternateCase(textNode: TextNode) {
  var text = textNode.characters;
  var newText = '';
  var charIndex = 0;
  
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    if (/[a-zA-Z]/.test(char)) {
      newText += (charIndex % 2 === 0) ? char.toLowerCase() : char.toUpperCase();
      charIndex++;
    } else {
      newText += char;
    }
  }
  
  textNode.characters = newText;
}

function applyAlternateColor(textNode: TextNode, color1, color2) {
  var length = textNode.characters.length;
  
  for (var i = 0; i < length; i++) {
    var color = (i % 2 === 0) ? color1 : color2;
    textNode.setRangeFills(i, i + 1, [{ type: 'SOLID', color: color }]);
  }
}

function applyAlternateFont(textNode: TextNode, altFontFamily) {
  var length = textNode.characters.length;
  var originalFont = textNode.fontName;
  
  if (originalFont === figma.mixed) {
    originalFont = { family: 'Inter', style: 'Regular' };
  }

  for (var i = 0; i < length; i++) {
    if (i % 2 === 1) {
      try {
        textNode.setRangeFontName(i, i + 1, { family: altFontFamily, style: 'Regular' });
      } catch (e) {
        // Font not available, skip
      }
    }
  }
}

function applyRandomCase(textNode: TextNode) {
  var text = textNode.characters;
  var newText = '';
  
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    if (/[a-zA-Z]/.test(char)) {
      newText += Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase();
    } else {
      newText += char;
    }
  }
  
  textNode.characters = newText;
}

function applyRainbow(textNode: TextNode) {
  var length = textNode.characters.length;
  
  for (var i = 0; i < length; i++) {
    var hue = (i / length) * 360;
    var color = hslToRgb(hue / 360, 0.8, 0.6);
    textNode.setRangeFills(i, i + 1, [{ type: 'SOLID', color: color }]);
  }
}

function applyGradient(textNode: TextNode, color1, color2) {
  var length = textNode.characters.length;
  
  for (var i = 0; i < length; i++) {
    var t = length > 1 ? i / (length - 1) : 0;
    var color = {
      r: color1.r + (color2.r - color1.r) * t,
      g: color1.g + (color2.g - color1.g) * t,
      b: color1.b + (color2.b - color1.b) * t
    };
    textNode.setRangeFills(i, i + 1, [{ type: 'SOLID', color: color }]);
  }
}

function applyWaveSize(textNode: TextNode) {
  var length = textNode.characters.length;
  var baseSize = textNode.fontSize;
  
  if (baseSize === figma.mixed) {
    baseSize = 16;
  }

  for (var i = 0; i < length; i++) {
    var wave = Math.sin((i / length) * Math.PI * 2) * 0.5 + 0.5;
    var size = Math.round((baseSize as number) * (0.6 + wave * 0.8));
    textNode.setRangeFontSize(i, i + 1, size);
  }
}

function applyGlitch(textNode: TextNode, options) {
  var text = textNode.characters;
  var length = text.length;
  
  // Glitch characters to randomly insert
  var glitchChars = ['̵', '̶', '̷', '̸', '̴', '̢', '̧', '̨', '̡', '̛'];
  
  // Apply random colors and fonts
  for (var i = 0; i < length; i++) {
    if (Math.random() > 0.7) {
      // Random bright colors for glitch effect
      var glitchColors = [
        { r: 1, g: 0, b: 0.5 },
        { r: 0, g: 1, b: 1 },
        { r: 1, g: 1, b: 0 },
        { r: 0.5, g: 0, b: 1 }
      ];
      var color = glitchColors[Math.floor(Math.random() * glitchColors.length)];
      textNode.setRangeFills(i, i + 1, [{ type: 'SOLID', color: color }]);
    }
    
    if (Math.random() > 0.8) {
      try {
        textNode.setRangeFontName(i, i + 1, { family: options.altFont, style: 'Regular' });
      } catch (e) {
        // Font not available
      }
    }
  }
}

// Helper: HSL to RGB conversion
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    var hue2rgb = function(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: r, g: g, b: b };
}

// ========================================================================
// Stroke Scatter Effect (Adapted from Illustrator Scriptographer)
// ========================================================================

interface ScatterOptions {
  density: number;      // dots per point
  distance: number;     // distance between sample points
  offset: number;       // random position offset
  rotation: number;     // max random rotation (degrees)
  scaleMin: number;     // min scale factor (0-100)
  scaleMax: number;     // max scale factor (0-100)
}

function randomBetweenFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomBetween(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min);
}

// Get points along a vector network at specified intervals
function getPointsAlongPath(vectorNode: VectorNode, distance: number): Array<{x: number, y: number}> {
  var points: Array<{x: number, y: number}> = [];
  var network = vectorNode.vectorNetwork;
  
  if (!network || !network.vertices || network.vertices.length === 0) {
    return points;
  }
  
  // For each segment in the network, sample points
  for (var i = 0; i < network.segments.length; i++) {
    var segment = network.segments[i];
    var startVertex = network.vertices[segment.start];
    var endVertex = network.vertices[segment.end];
    
    // Get start and end positions
    var x1 = startVertex.x + vectorNode.x;
    var y1 = startVertex.y + vectorNode.y;
    var x2 = endVertex.x + vectorNode.x;
    var y2 = endVertex.y + vectorNode.y;
    
    // Handle tangents for bezier curves
    var hasTangent = segment.tangentStart && segment.tangentEnd;
    
    if (hasTangent) {
      // Bezier curve - sample along curve
      var segmentLength = estimateBezierLength(
        x1, y1,
        x1 + segment.tangentStart.x, y1 + segment.tangentStart.y,
        x2 + segment.tangentEnd.x, y2 + segment.tangentEnd.y,
        x2, y2
      );
      
      var numSamples = Math.max(1, Math.ceil(segmentLength / distance));
      
      for (var t = 0; t <= 1; t += 1 / numSamples) {
        var pt = getBezierPoint(
          t,
          x1, y1,
          x1 + segment.tangentStart.x, y1 + segment.tangentStart.y,
          x2 + segment.tangentEnd.x, y2 + segment.tangentEnd.y,
          x2, y2
        );
        points.push(pt);
      }
    } else {
      // Straight line - sample along line
      var dx = x2 - x1;
      var dy = y2 - y1;
      var segmentLength = Math.sqrt(dx * dx + dy * dy);
      var numSamples = Math.max(1, Math.ceil(segmentLength / distance));
      
      for (var j = 0; j <= numSamples; j++) {
        var t = j / numSamples;
        points.push({
          x: x1 + dx * t,
          y: y1 + dy * t
        });
      }
    }
  }
  
  return points;
}

function estimateBezierLength(x1, y1, cx1, cy1, cx2, cy2, x2, y2): number {
  // Approximate bezier length using chord + control polygon method
  var chord = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  var controlNet = Math.sqrt((cx1 - x1) * (cx1 - x1) + (cy1 - y1) * (cy1 - y1)) +
                   Math.sqrt((cx2 - cx1) * (cx2 - cx1) + (cy2 - cy1) * (cy2 - cy1)) +
                   Math.sqrt((x2 - cx2) * (x2 - cx2) + (y2 - cy2) * (y2 - cy2));
  return (chord + controlNet) / 2;
}

function getBezierPoint(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2): {x: number, y: number} {
  var u = 1 - t;
  var tt = t * t;
  var uu = u * u;
  var uuu = uu * u;
  var ttt = tt * t;
  
  return {
    x: uuu * x1 + 3 * uu * t * cx1 + 3 * u * tt * cx2 + ttt * x2,
    y: uuu * y1 + 3 * uu * t * cy1 + 3 * u * tt * cy2 + ttt * y2
  };
}

function applyScatterEffect(options: ScatterOptions) {
  var selection = figma.currentPage.selection;
  
  if (selection.length < 2) {
    figma.notify('⚠ Select at least 2 objects: source element(s) and a path', { error: true });
    return;
  }
  
  // Last selected item is the path, rest are source elements
  var pathNode = selection[selection.length - 1];
  var sourceNodes = selection.slice(0, -1);
  
  // Validate path node
  if (pathNode.type !== 'VECTOR' && pathNode.type !== 'LINE' && pathNode.type !== 'ELLIPSE' && pathNode.type !== 'RECTANGLE' && pathNode.type !== 'POLYGON' && pathNode.type !== 'STAR') {
    figma.notify('⚠ Last selected item must be a vector/shape path', { error: true });
    return;
  }
  
  figma.notify('🦋 Scattering elements along path...');
  
  // Get points along the path
  var points: Array<{x: number, y: number}> = [];
  
  if (pathNode.type === 'VECTOR') {
    points = getPointsAlongPath(pathNode as VectorNode, options.distance);
  } else {
    // For other shape types, flatten to path first or use bounding box
    // Simple approach: sample around bounding box or outline
    points = getShapeOutlinePoints(pathNode, options.distance);
  }
  
  if (points.length === 0) {
    figma.notify('⚠ Could not extract points from path', { error: true });
    return;
  }
  
  // Create group for scattered elements
  var scatterGroup = figma.group([], figma.currentPage);
  scatterGroup.name = 'Scatter Group';
  
  // For each point, create scattered copies
  var createdNodes: SceneNode[] = [];
  
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    
    for (var d = 0; d < options.density; d++) {
      // Random offset
      var offsetX = (d % 2 === 0) 
        ? randomBetweenFloat(0, options.offset)
        : -randomBetweenFloat(0, options.offset);
      var offsetY = (d % 2 === 0)
        ? -randomBetweenFloat(0, options.offset)
        : randomBetweenFloat(0, options.offset);
      
      // Select random source element
      var sourceIndex = randomBetween(0, sourceNodes.length - 1);
      var sourceNode = sourceNodes[sourceIndex];
      
      // Clone the source
      var clone = sourceNode.clone();
      
      // Position at point with offset
      clone.x = point.x + offsetX - clone.width / 2;
      clone.y = point.y + offsetY - clone.height / 2;
      
      // Random rotation
      if (options.rotation > 0) {
        var angle = randomBetweenFloat(0, options.rotation);
        // Rotate around center
        var centerX = clone.x + clone.width / 2;
        var centerY = clone.y + clone.height / 2;
        clone.rotation = angle;
      }
      
      // Random scale
      var scaleMin = options.scaleMin / 100;
      var scaleMax = options.scaleMax / 100;
      var scaleFactor = randomBetweenFloat(scaleMin, scaleMax);
      
      if (scaleFactor !== 1 && 'resize' in clone) {
        var newWidth = clone.width * scaleFactor;
        var newHeight = clone.height * scaleFactor;
        (clone as any).resize(newWidth, newHeight);
      }
      
      createdNodes.push(clone);
    }
  }
  
  // Group all created nodes
  if (createdNodes.length > 0) {
    var finalGroup = figma.group(createdNodes, figma.currentPage);
    finalGroup.name = 'Scattered Elements';
    figma.currentPage.selection = [finalGroup];
    figma.viewport.scrollAndZoomIntoView([finalGroup]);
  }
  
  figma.notify('✓ Scattered ' + createdNodes.length + ' elements!');
  figma.ui.postMessage({ type: 'status', text: 'Ready', connected: true });
}

function getShapeOutlinePoints(node: SceneNode, distance: number): Array<{x: number, y: number}> {
  var points: Array<{x: number, y: number}> = [];
  var bounds = node;
  
  if (node.type === 'ELLIPSE') {
    // Sample around ellipse
    var cx = node.x + node.width / 2;
    var cy = node.y + node.height / 2;
    var rx = node.width / 2;
    var ry = node.height / 2;
    
    var circumference = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
    var numPoints = Math.max(8, Math.ceil(circumference / distance));
    
    for (var i = 0; i < numPoints; i++) {
      var angle = (i / numPoints) * 2 * Math.PI;
      points.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle)
      });
    }
  } else if (node.type === 'RECTANGLE') {
    // Sample around rectangle perimeter
    var x = node.x;
    var y = node.y;
    var w = node.width;
    var h = node.height;
    var perimeter = 2 * (w + h);
    var numPoints = Math.max(4, Math.ceil(perimeter / distance));
    var pointsPerSide = numPoints / 4;
    
    // Top edge
    for (var i = 0; i < pointsPerSide; i++) {
      points.push({ x: x + (i / pointsPerSide) * w, y: y });
    }
    // Right edge
    for (var i = 0; i < pointsPerSide; i++) {
      points.push({ x: x + w, y: y + (i / pointsPerSide) * h });
    }
    // Bottom edge
    for (var i = 0; i < pointsPerSide; i++) {
      points.push({ x: x + w - (i / pointsPerSide) * w, y: y + h });
    }
    // Left edge
    for (var i = 0; i < pointsPerSide; i++) {
      points.push({ x: x, y: y + h - (i / pointsPerSide) * h });
    }
  } else if (node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'LINE') {
    // For polygons/stars/lines, use bounding box corners as fallback
    var x = node.x;
    var y = node.y;
    var w = node.width;
    var h = node.height;
    var perimeter = 2 * (w + h);
    var numPoints = Math.max(4, Math.ceil(perimeter / distance));
    
    for (var i = 0; i < numPoints; i++) {
      var t = i / numPoints;
      if (t < 0.25) {
        points.push({ x: x + (t * 4) * w, y: y });
      } else if (t < 0.5) {
        points.push({ x: x + w, y: y + ((t - 0.25) * 4) * h });
      } else if (t < 0.75) {
        points.push({ x: x + w - ((t - 0.5) * 4) * w, y: y + h });
      } else {
        points.push({ x: x, y: y + h - ((t - 0.75) * 4) * h });
      }
    }
  }
  
  return points;
}

// ========================================================================
// Translation/Morph Effect (Adapted from Illustrator Scriptographer)
// ========================================================================

interface TranslationOptions {
  steps: number;        // number of copies
  backColor: RGB;       // starting color
  frontColor: RGB;      // ending color
  backStrokeWidth: number;
  frontStrokeWidth: number;
  rotation: number;     // total rotation
  scale: number;        // final scale percentage
  moveX: number;        // total X translation
  moveY: number;        // total Y translation
}

function applyTranslationEffect(options: TranslationOptions) {
  var selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('⚠ Select at least one object', { error: true });
    return;
  }
  
  if (options.steps < 1) {
    figma.notify('⚠ Steps must be at least 1', { error: true });
    return;
  }
  
  figma.notify('🦋 Applying translation effect...');
  
  var createdNodes: SceneNode[] = [];
  
  for (var s = 0; s < selection.length; s++) {
    var sourceNode = selection[s];
    
    for (var step = 0; step <= options.steps; step++) {
      var t = options.steps > 0 ? step / options.steps : 0;
      
      // Interpolate values
      var currentMoveX = t * options.moveX;
      var currentMoveY = t * options.moveY;
      var currentScale = 1 - t * (1 - options.scale / 100);
      var currentRotation = t * options.rotation;
      
      // Interpolate colors
      var currentColor = {
        r: options.backColor.r + (options.frontColor.r - options.backColor.r) * t,
        g: options.backColor.g + (options.frontColor.g - options.backColor.g) * t,
        b: options.backColor.b + (options.frontColor.b - options.backColor.b) * t
      };
      
      // Interpolate stroke width
      var currentStrokeWidth = options.backStrokeWidth + (options.frontStrokeWidth - options.backStrokeWidth) * t;
      
      // Clone the source
      var clone = sourceNode.clone();
      
      // Apply translation
      clone.x = sourceNode.x + currentMoveX;
      clone.y = sourceNode.y + currentMoveY;
      
      // Store original center
      var centerX = clone.x + clone.width / 2;
      var centerY = clone.y + clone.height / 2;
      
      // Apply scale
      if (currentScale !== 1 && 'resize' in clone) {
        var newWidth = clone.width * currentScale;
        var newHeight = clone.height * currentScale;
        (clone as any).resize(newWidth, newHeight);
        
        // Re-center after scaling
        clone.x = centerX - newWidth / 2;
        clone.y = centerY - newHeight / 2;
      }
      
      // Apply rotation
      if (currentRotation !== 0) {
        clone.rotation = currentRotation;
      }
      
      // Apply color to fills
      if ('fills' in clone && clone.fills !== figma.mixed) {
        var newFills = (clone.fills as ReadonlyArray<Paint>).map(function(fill) {
          if (fill.type === 'SOLID') {
            return {
              type: 'SOLID' as const,
              color: currentColor,
              opacity: fill.opacity
            };
          }
          return fill;
        });
        (clone as GeometryMixin).fills = newFills;
      }
      
      // Apply stroke color and width
      if ('strokes' in clone && clone.strokes !== figma.mixed) {
        var newStrokes = (clone.strokes as ReadonlyArray<Paint>).map(function(stroke) {
          if (stroke.type === 'SOLID') {
            return {
              type: 'SOLID' as const,
              color: currentColor,
              opacity: stroke.opacity
            };
          }
          return stroke;
        });
        (clone as GeometryMixin).strokes = newStrokes;
      }
      
      if ('strokeWeight' in clone) {
        (clone as any).strokeWeight = currentStrokeWidth;
      }
      
      createdNodes.push(clone);
    }
  }
  
  // Group all created nodes
  if (createdNodes.length > 0) {
    var finalGroup = figma.group(createdNodes, figma.currentPage);
    finalGroup.name = 'Translation Effect';
    figma.currentPage.selection = [finalGroup];
    figma.viewport.scrollAndZoomIntoView([finalGroup]);
  }
  
  figma.notify('✓ Created ' + createdNodes.length + ' transition steps!');
  figma.ui.postMessage({ type: 'status', text: 'Ready', connected: true });
}

// ========================================================================
// Text on Path Effect
// ========================================================================

interface TextOnPathOptions {
  spacing: number;        // additional spacing between characters
  offset: number;         // offset from path start (0-100%)
  align: string;          // 'left', 'center', 'right'
  flipDirection: boolean; // reverse direction along path
  verticalOffset: number; // offset perpendicular to path
}

function applyTextOnPath(options: TextOnPathOptions) {
  var selection = figma.currentPage.selection;
  
  if (selection.length < 2) {
    figma.notify('⚠ Select a text layer and a path', { error: true });
    figma.ui.postMessage({ type: 'status', text: 'Select text + path', connected: false });
    return;
  }
  
  // Find text node and path node
  var textNode: TextNode | null = null;
  var pathNode: SceneNode | null = null;
  
  for (var i = 0; i < selection.length; i++) {
    if (selection[i].type === 'TEXT') {
      textNode = selection[i] as TextNode;
    } else if (selection[i].type === 'VECTOR' || selection[i].type === 'LINE' || 
               selection[i].type === 'ELLIPSE' || selection[i].type === 'RECTANGLE' ||
               selection[i].type === 'POLYGON' || selection[i].type === 'STAR') {
      pathNode = selection[i];
    }
  }
  
  if (!textNode) {
    figma.notify('⚠ No text layer found in selection', { error: true });
    return;
  }
  
  if (!pathNode) {
    figma.notify('⚠ No path/shape found in selection', { error: true });
    return;
  }
  
  figma.notify('🦋 Placing text on path...');
  
  // Get the text content
  var text = textNode.characters;
  if (!text || text.length === 0) {
    figma.notify('⚠ Text layer is empty', { error: true });
    return;
  }
  
  // Get font info from text node
  var fontName = textNode.fontName;
  var fontSize = textNode.fontSize;
  var textFills = textNode.fills;
  
  if (fontName === figma.mixed) {
    fontName = { family: 'Inter', style: 'Regular' };
  }
  if (fontSize === figma.mixed) {
    fontSize = 16;
  }
  
  // Get points along the path with tangent information
  var pathData: Array<{x: number, y: number, angle: number}> = [];
  
  if (pathNode.type === 'VECTOR') {
    pathData = getPointsWithTangents(pathNode as VectorNode, 1); // Sample every 1px for accuracy
  } else {
    pathData = getShapePointsWithTangents(pathNode, 1);
  }
  
  if (pathData.length < 2) {
    figma.notify('⚠ Path is too short', { error: true });
    return;
  }
  
  // Reverse if needed
  if (options.flipDirection) {
    pathData.reverse();
    // Also flip the angles
    for (var i = 0; i < pathData.length; i++) {
      pathData[i].angle += 180;
    }
  }
  
  // Calculate total path length
  var totalLength = pathData.length - 1;
  
  // Load the font
  figma.loadFontAsync(fontName as FontName).then(function() {
    var createdNodes: SceneNode[] = [];
    
    // Calculate starting position based on alignment
    var charWidths: number[] = [];
    var totalTextWidth = 0;
    
    // Create temporary text nodes to measure character widths
    var measurePromises: Promise<number>[] = [];
    
    for (var i = 0; i < text.length; i++) {
      measurePromises.push(measureCharWidth(text[i], fontName as FontName, fontSize as number));
    }
    
    Promise.all(measurePromises).then(function(widths) {
      charWidths = widths;
      totalTextWidth = widths.reduce(function(a, b) { return a + b; }, 0);
      totalTextWidth += (text.length - 1) * options.spacing;
      
      // Calculate start position based on alignment
      var startOffset = (options.offset / 100) * totalLength;
      
      if (options.align === 'center') {
        startOffset = ((totalLength - totalTextWidth) / 2) + (options.offset / 100) * totalLength;
      } else if (options.align === 'right') {
        startOffset = totalLength - totalTextWidth + (options.offset / 100) * totalLength;
      }
      
      var currentPosition = Math.max(0, startOffset);
      
      // Place each character
      for (var i = 0; i < text.length; i++) {
        var char = text[i];
        
        // Skip spaces but still advance position
        if (char === ' ') {
          currentPosition += charWidths[i] + options.spacing;
          continue;
        }
        
        // Get position and angle at current point
        var pointIndex = Math.min(Math.floor(currentPosition), pathData.length - 1);
        pointIndex = Math.max(0, pointIndex);
        
        var point = pathData[pointIndex];
        
        // Create text node for this character
        var charNode = figma.createText();
        charNode.fontName = fontName as FontName;
        charNode.fontSize = fontSize as number;
        charNode.characters = char;
        
        if (textFills !== figma.mixed) {
          charNode.fills = textFills as Paint[];
        }
        
        // Position at path point
        var perpAngle = (point.angle + 90) * Math.PI / 180;
        var offsetX = Math.cos(perpAngle) * options.verticalOffset;
        var offsetY = Math.sin(perpAngle) * options.verticalOffset;
        
        charNode.x = point.x - charNode.width / 2 + offsetX;
        charNode.y = point.y - charNode.height / 2 + offsetY;
        
        // Rotate to follow path
        charNode.rotation = -point.angle;
        
        createdNodes.push(charNode);
        
        // Advance position
        currentPosition += charWidths[i] + options.spacing;
      }
      
      // Group all characters
      if (createdNodes.length > 0) {
        var group = figma.group(createdNodes, figma.currentPage);
        group.name = 'Text on Path: ' + text.substring(0, 20) + (text.length > 20 ? '...' : '');
        figma.currentPage.selection = [group];
        figma.viewport.scrollAndZoomIntoView([group]);
        figma.notify('✓ Text placed on path!');
      }
      
      figma.ui.postMessage({ type: 'status', text: 'Ready', connected: true });
    });
  }).catch(function() {
    // Fallback to Inter
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }).then(function() {
      figma.notify('⚠ Font not available, using Inter', { error: true });
    });
  });
}

function measureCharWidth(char: string, font: FontName, size: number): Promise<number> {
  return new Promise(function(resolve) {
    var tempText = figma.createText();
    figma.loadFontAsync(font).then(function() {
      tempText.fontName = font;
      tempText.fontSize = size;
      tempText.characters = char;
      var width = tempText.width;
      tempText.remove();
      resolve(width);
    }).catch(function() {
      tempText.remove();
      resolve(size * 0.6); // Fallback estimate
    });
  });
}

function getPointsWithTangents(vectorNode: VectorNode, sampleDistance: number): Array<{x: number, y: number, angle: number}> {
  var points: Array<{x: number, y: number, angle: number}> = [];
  var network = vectorNode.vectorNetwork;
  
  if (!network || !network.vertices || network.vertices.length === 0) {
    return points;
  }
  
  for (var i = 0; i < network.segments.length; i++) {
    var segment = network.segments[i];
    var startVertex = network.vertices[segment.start];
    var endVertex = network.vertices[segment.end];
    
    var x1 = startVertex.x + vectorNode.x;
    var y1 = startVertex.y + vectorNode.y;
    var x2 = endVertex.x + vectorNode.x;
    var y2 = endVertex.y + vectorNode.y;
    
    var hasTangent = segment.tangentStart && segment.tangentEnd;
    
    if (hasTangent) {
      var cx1 = x1 + segment.tangentStart.x;
      var cy1 = y1 + segment.tangentStart.y;
      var cx2 = x2 + segment.tangentEnd.x;
      var cy2 = y2 + segment.tangentEnd.y;
      
      var segmentLength = estimateBezierLength(x1, y1, cx1, cy1, cx2, cy2, x2, y2);
      var numSamples = Math.max(2, Math.ceil(segmentLength / sampleDistance));
      
      for (var j = 0; j <= numSamples; j++) {
        var t = j / numSamples;
        var pt = getBezierPoint(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2);
        var tangent = getBezierTangent(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2);
        var angle = Math.atan2(tangent.y, tangent.x) * 180 / Math.PI;
        
        points.push({ x: pt.x, y: pt.y, angle: angle });
      }
    } else {
      var dx = x2 - x1;
      var dy = y2 - y1;
      var segmentLength = Math.sqrt(dx * dx + dy * dy);
      var numSamples = Math.max(2, Math.ceil(segmentLength / sampleDistance));
      var angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      for (var j = 0; j <= numSamples; j++) {
        var t = j / numSamples;
        points.push({
          x: x1 + dx * t,
          y: y1 + dy * t,
          angle: angle
        });
      }
    }
  }
  
  return points;
}

function getBezierTangent(t: number, x1: number, y1: number, cx1: number, cy1: number, cx2: number, cy2: number, x2: number, y2: number): {x: number, y: number} {
  var u = 1 - t;
  var uu = u * u;
  var tt = t * t;
  
  // First derivative of cubic bezier
  return {
    x: 3 * uu * (cx1 - x1) + 6 * u * t * (cx2 - cx1) + 3 * tt * (x2 - cx2),
    y: 3 * uu * (cy1 - y1) + 6 * u * t * (cy2 - cy1) + 3 * tt * (y2 - cy2)
  };
}

function getShapePointsWithTangents(node: SceneNode, sampleDistance: number): Array<{x: number, y: number, angle: number}> {
  var points: Array<{x: number, y: number, angle: number}> = [];
  
  if (node.type === 'ELLIPSE') {
    var cx = node.x + node.width / 2;
    var cy = node.y + node.height / 2;
    var rx = node.width / 2;
    var ry = node.height / 2;
    
    var circumference = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
    var numPoints = Math.max(16, Math.ceil(circumference / sampleDistance));
    
    for (var i = 0; i < numPoints; i++) {
      var angle = (i / numPoints) * 2 * Math.PI;
      var tangentAngle = angle + Math.PI / 2; // Perpendicular to radius
      
      points.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
        angle: tangentAngle * 180 / Math.PI
      });
    }
  } else if (node.type === 'RECTANGLE') {
    var x = node.x;
    var y = node.y;
    var w = node.width;
    var h = node.height;
    
    // Top edge (left to right)
    var topPoints = Math.ceil(w / sampleDistance);
    for (var i = 0; i < topPoints; i++) {
      points.push({ x: x + (i / topPoints) * w, y: y, angle: 0 });
    }
    // Right edge (top to bottom)
    var rightPoints = Math.ceil(h / sampleDistance);
    for (var i = 0; i < rightPoints; i++) {
      points.push({ x: x + w, y: y + (i / rightPoints) * h, angle: 90 });
    }
    // Bottom edge (right to left)
    for (var i = 0; i < topPoints; i++) {
      points.push({ x: x + w - (i / topPoints) * w, y: y + h, angle: 180 });
    }
    // Left edge (bottom to top)
    for (var i = 0; i < rightPoints; i++) {
      points.push({ x: x, y: y + h - (i / rightPoints) * h, angle: 270 });
    }
  } else if (node.type === 'LINE') {
    var x1 = node.x;
    var y1 = node.y;
    var x2 = node.x + node.width;
    var y2 = node.y + node.height;
    var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    var length = Math.sqrt(node.width * node.width + node.height * node.height);
    var numPoints = Math.max(2, Math.ceil(length / sampleDistance));
    
    for (var i = 0; i <= numPoints; i++) {
      var t = i / numPoints;
      points.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        angle: angle
      });
    }
  } else {
    // Fallback for polygons, stars, etc - use bounding box
    var x = node.x;
    var y = node.y;
    var w = node.width;
    var h = node.height;
    var perimeter = 2 * (w + h);
    var numPoints = Math.max(8, Math.ceil(perimeter / sampleDistance));
    
    for (var i = 0; i < numPoints; i++) {
      var t = i / numPoints;
      var angle: number;
      var px: number, py: number;
      
      if (t < 0.25) {
        px = x + (t * 4) * w;
        py = y;
        angle = 0;
      } else if (t < 0.5) {
        px = x + w;
        py = y + ((t - 0.25) * 4) * h;
        angle = 90;
      } else if (t < 0.75) {
        px = x + w - ((t - 0.5) * 4) * w;
        py = y + h;
        angle = 180;
      } else {
        px = x;
        py = y + h - ((t - 0.75) * 4) * h;
        angle = 270;
      }
      
      points.push({ x: px, y: py, angle: angle });
    }
  }
  
  return points;
}
