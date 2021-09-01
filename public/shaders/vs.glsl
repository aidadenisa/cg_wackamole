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
in vec2 a_uv;

out vec3 fsNormal;
out vec3 fsPosition;
out vec2 uvFS;

uniform mat4 matrix;       // projection matrix
uniform mat4 nMatrix;      // normal matrix for World Space transformation of vertex normals = inverse of the trnspose of the World Matrix 
uniform mat4 pMatrix;      // world matrix for World Space transformation of vertex positions

void main() {
  //World Space Transformed
  //We need to transform in world space the position vertices and the normal vertices

  //WS transformed vertex normals
  fsNormal = mat3(nMatrix) * inNormal; 

  //WS transformed position
  fsPosition = (pMatrix * vec4(inPosition, 1.0)).xyz;

  //texture indices 
  uvFS = a_uv;

  gl_Position = matrix * vec4(inPosition, 1.0);
}
