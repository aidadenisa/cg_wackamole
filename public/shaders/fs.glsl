#version 300 es

precision mediump float;

in vec3 fsPosition;
in vec3 fsNormal;
in vec2 uvFS;

uniform sampler2D u_texture;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

uniform vec3 eyePos; //camera position


//LL - point light left
//LR - point light rigth
//LS - spot light

//Directions
//uniform vec3 lightDirL;
//uniform vec3 lightDirR;
//uniform vec3 lightDirS;

//Color(intensity)
uniform vec3 lightColorL;
uniform vec3 lightColorR;
uniform vec3 lightColorS;

//Light Positions
uniform vec3 lightPositionL; //point light position
uniform vec3 lightPositionR; //point light position
uniform vec3 lightPositionS; //spot light position

uniform float LTarget; //point light target
uniform float LDecay; //point light decay
uniform float SpecShine;

out vec4 outColor;


void main() {

  vec3 materialColor = texture(u_texture, uvFS).xyz;
  vec3 specularColor = texture(u_texture, uvFS).xyz;

  //World Space 


  //normalize the vertex normal vector
  vec3 nNormal = normalize(fsNormal);

  // Eye Direction 
  ////   > eyePos - camera position
	vec3 eyedirVec = normalize(eyePos - fsPosition);


  // Light direction: Spot Light and Point Light are the same
  //// > Normalized, in world space??? vec3 nLightDirection = normalize(-lightDirection)
  vec3 lightDirL = normalize(lightPositionL - fsPosition);
  vec3 lightDirR = normalize(lightPositionR - fsPosition);
  vec3 lightDirS = normalize(lightPositionS - fsPosition);




  // Light color

  //// Point Light:
  ////   > LTarget - distance that represents the limit of the high intensty light
  vec3 finalLightColorL = lightColorL * pow(LTarget / length(lightPositionL - fsPosition), LDecay);
  vec3 finalLightColorR = lightColorR * pow(LTarget / length(lightPositionR - fsPosition), LDecay);


  //// Spot Light:
  ////   > LDir - direction of the spot d towards which we are lighting the spotlight
  //float CosAngle = dot(spotLightDir, LDir);
  //float LCosOut = cos(radians(LConeOut / 2.0));
	//float LCosIn = cos(radians(LConeOut * LConeIn / 2.0));
  //vec4 spotLightCol = lightColor * pow(LTarget / length(lightPos - fsPosition), LDecay) *
	//					clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);



  //Diffuse lambert
  ////  > lightDir - light direction
  ////  > nNormal - direction of the normal vecotr to the surface
  ////  > materialColor - has to be calculated using Texture 
  //WITHOUT DECAY
	vec3 diffuseLambertL = materialColor * finalLightColorL * dot(lightDirL,  nNormal);
	vec3 diffuseLambertR = materialColor * clamp( dot(lightDirR,  nNormal), 0.0, 1.0);

  //Phong Specular
  vec3 rL = - reflect(lightDirL, nNormal);
  vec3 specularPhongL =  specularColor * pow(clamp(dot(eyedirVec, rL),0.0,1.0), SpecShine);

  //other things: ambient? maybe 

  //vec3 lambertColor = texture(u_texture, uvFS).xyz * lightColor * dot(-lightDirection,nNormal);
  //outColor = vec4(clamp(lambertColor, 0.0, 1.0),1.0);

  outColor = vec4(clamp(diffuseLambertL,0.0, 1.0), 1.0); 
}