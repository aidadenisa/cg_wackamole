#version 300 es

//in vec3 a_position;
//in vec2 a_uv;
//out vec2 uvFS;

//uniform mat4 matrix; 
//void main() {
//  uvFS = a_uv;
//  gl_Position = matrix * vec4(a_position,1.0);
//}

in vec3 inPosition;
in vec3 inNormal;
out vec3 fsNormal;

uniform mat4 matrix;       //world matrix
uniform mat4 nMatrix;     //matrix to transform normals

void main() {
  fsNormal = mat3(nMatrix) * inNormal; 
  gl_Position = matrix * vec4(inPosition, 1.0);
}
