# PixelRat
**this is a simple but very capable online pixel art editor!**  
(made entirely from scratch using HTML/JS)

URL: https://pixelrat.vercel.app/

## keyboard shortcuts
**ctrl + z** - undo  
**ctrl + y** - redo  
**[number keys]** - hotkey to the corresponding tool  

## what does each tool do?

### pen settings
_the pen can be used to draw stuff, freehand_
- `color` and `opacity` determine the pen's color
- `size` determines the thickness of lines drawn by the pen

### eraser settings
_the eraser erases stuff_
- `size` determines the size of the eraser

### fill bucket settings
_the fill bucket can be used to fill in a closed region with a color_
- `color` and `opacity` determine the color of the fill
- when `8-neighbour` is enabled, the "paint can move through diagonal gaps". normally, if you click on a pixel, the paint flows to the pixels north, south, east and west of it. when this option is enabled, the paint will also flow to it's northeast, northwest, southeast and southwest

### line tool settings
_draws lines_
- `color` and `opacity` determine the color of the fill
- `line width` is the thickness of the line drawn
- `constant slope` ensures that the line always goes in the y-direction a constant amount for a certain corresponding distance it goes in the x-direction. ("slope" is constant)

### ellipse tool settings
_draws an ellipse (outline only)_
- `color` and `opacity` determine the color of the ellipse (outline)
- when `control ellipse's center` is disabled, the pixel from which you begin dragging the mouse is the ellipse's (bounding box's) corner. when `control ellipse's center` is enabled, the pixel from which you begin dragging the mouse is the ellipse's center.
- `stroke thickness` is the thickness of the ellipse's outline
- if `circle` is checked, the ellipse drawn will be a perfect circle

## rectangle tool settings
_draws a rectangle (outline only)_
- `color` and `opacity` determine the color of the rectangle (outline)
- `stroke thickness` is the thickness of the rectangle's outline
- if `square` is checked, the rectangle drawn will be a perfect square


### layer settings
_these settings determine properties of the currently selected layer, which is indicated in the panel titled **layers** below the settings panel_
- `name` is the name of the selected layer
- `layer opacity` is a variable that affects the opacity of the whole layer

### viewport settings
- `center viewport` keeps the canvas you draw on centered on the screen
- `zoom to fit` keeps the canvas zoomed to the maximum possible size that fits on your screen
- the `reset zoom` button sets the zoom value to 1
- `viewport pan x` and `viewport pan y` are the x and y coordinates of the top-left corner of the canvas. you can't modify them when `center viewport` is enabled.
- `viewport zoom` is the zoom factor of the canvas, and cannot be modified when `zoom to fit` is enabled
- `transparency color 1` and `transparency color 2` determine the two colors used in the checkered pattern in the background, that indicates transparency

### project settings
- `load project` allows you to upload a PixelRat Project File (a .json file that you get by hitting the yellow button titled "export project \[as JSON]") and resume work on that project
- `pixel size` determines the size of the individual pixels in the _final exported PNG_ (the .png file you get when you click the other big yellow button titled "save transparent PNG")
- `project width` and `project height` determine the number of pixels on the canvas (the width and height of the pixel grid)
- the `undo` and `redo` buttons undo or redo your actions, respectively

## layers
the little panel below the tool settings panel is the **layers** panel.  
the 4 buttons in the panel `create a layer`, `delete the selected layer`, `move the selected layer up` and `move the selected layer down`, respectively.  
the **active layer** is indicated by a rectangle that's a little lighter than the background. _only the active layer is modified by tools._  
the layers are drawn from top to bottom, so the bottom-most layer is actually on top.  

## conclusion
so yeah, thats about it. now go make some cool stuff with [PixelRat](https://pixelrat.vercel.app/) :)