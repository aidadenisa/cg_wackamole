

// var vertexShaderSource = `#version 300 es

// in vec3 a_position;
// in vec3 a_color;
// out vec3 colorV;

// uniform mat4 matrix; 
// void main() {
//   colorV = a_color;
//   gl_Position = matrix * vec4(a_position,1.0);
// }
// `;

var vertexShaderSource = `#version 300 es

in vec3 inPosition;
in vec3 inNormal;
out vec3 fsNormal;

uniform mat4 matrix; 
uniform mat4 nMatrix;     //matrix to transform normals

void main() {
  fsNormal = mat3(nMatrix) * inNormal; 
  gl_Position = matrix * vec4(inPosition, 1.0);
}`;


//constant color:
// in vec3 fs_colour;


// color using uniform vars:
/*uniform vec3 u_colour;
uniform float colour_choice;
uniform vec2 u_second_colour;
...
vec3 fs_colour = u_colour * colour_choice + vec3(u_second_colour, 0.0) * (1.0 - colour_choice);
*/


var fragmentShaderSource  = `#version 300 es

precision mediump float;

in vec3 fsNormal;
out vec4 outColor;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

void main() {

  vec3 nNormal = normalize(fsNormal);
  vec3 lambertColor = mDiffColor * lightColor * dot(-lightDirection,nNormal);
  outColor = vec4(clamp(lambertColor, 0.0, 1.0),1.0);
}`;