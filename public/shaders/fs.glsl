#version 300 es

//precision mediump float;

//in vec2 uvFS;
//out vec4 outColor;
//uniform sampler2D u_texture;

//void main() {
//  outColor = texture(u_texture, uvFS);
//}

precision mediump float;

in vec3 fsNormal;
in vec2 uvFS;
uniform sampler2D u_texture;

out vec4 outColor;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

void main() {

  vec3 nNormal = normalize(fsNormal);
  vec3 lambertColor = texture(u_texture, uvFS).xyz * lightColor * dot(-lightDirection,nNormal);
  outColor = vec4(clamp(lambertColor, 0.0, 1.0),1.0);
}