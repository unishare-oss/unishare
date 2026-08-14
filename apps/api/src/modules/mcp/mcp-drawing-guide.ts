export const drawingGuide = `
Before drawing:
- Call read_me before the first draw_board call in a task, and apply these rules to every subsequent draw.
- Plan the diagram before sending elements. Keep related content grouped, leave space between sections, and use a consistent left-to-right or top-to-bottom flow.
- Route arrows through clear space: do not let arrows overlap, cross each other, pass through shapes, or obscure labels. Reposition elements to create separate connector lanes when needed.
- For board revisions, send the complete scene and correct existing coordinates and connectors rather than layering new arrows over a bad layout.

Element rules:
- Use rectangles for systems or processes, diamonds for decisions, ellipses for entry or exit points, text for labels, and arrows for flow.
- Add a text label for every shape that needs identification. Use arrow points as relative [x, y] waypoints: start with [0, 0], add orthogonal bends through clear connector lanes, and end at the target.
- Use the default blue rectangle, amber diamond, and green ellipse outlines unless a different semantic color makes the diagram clearer. Keep shape backgrounds transparent by default.
- Keep text concise and avoid overlapping elements, text, or connectors.

UniShare draw_board format:
- Supply the target board slug and elements as a JSON-stringified array containing 1 to 100 elements.
- Shapes need x, y, width, and height. Text needs x, y, and text. Arrows need x, y, plus either points (preferred) or endX and endY for a straight arrow.
- Optional strokeColor and backgroundColor values are hex colors; use transparent for backgroundColor unless a filled shape has a clear semantic purpose.
`
