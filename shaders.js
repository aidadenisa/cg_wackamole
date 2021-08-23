

var vertexShaderSource = `#version 300 es

in vec3 a_position;
in vec3 a_color;
out vec3 colorV;

uniform mat4 matrix; 
void main() {
  colorV = a_color;
  gl_Position = matrix * vec4(a_position,1.0);
}
`;

//constant color:
// in vec3 fs_colour;


// color using uniform vars:
/*uniform vec3 u_colour;
uniform float colour_choice;
uniform vec2 u_second_colour;
...
vec3 fs_colour = u_colour * colour_choice + vec3(u_second_colour, 0.0) * (1.0 - colour_choice);
*/



var fragmentShaderSource = `#version 300 es

precision mediump float;


in vec3 colorV;
out vec4 outColor;

void main() {
  outColor = vec4(colorV,1.0);
}
`;