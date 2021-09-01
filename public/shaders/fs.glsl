#version 300 es

precision mediump float;

in vec3 fsPosition;
in vec3 fsNormal;
in vec2 uvFS;

uniform sampler2D u_texture;

uniform vec3 eyePos; //camera position

//LL - point light left
//LR - point light rigth
//LS - spot light

//Directions
uniform vec3 lightDirS;

//Color(intensity)
uniform vec3 lightColorL;
uniform vec3 lightColorR;
uniform vec3 lightColorS;
uniform vec3 ambientLightColor;

//Light Positions
uniform vec3 lightPositionL; //point light position
uniform vec3 lightPositionR; //point light position
uniform vec3 lightPositionS; //spot light position

uniform float LTarget; //point light target
uniform float LDecay; //point light decay
uniform float SpecShine;

uniform float LConeOut; //spotlight cone out angle
uniform float LConeIn;  //spotlight cone in angle

out vec4 outColor;

void main() {

  vec3 materialColor = texture(u_texture, uvFS).xyz;
  vec3 specularColor = vec3(1.0, 1.0, 1.0) * 0.7 + materialColor * (0.3);
  vec3 ambColor = materialColor;

  //World Space 

  //normalize the vertex normal vector
  vec3 nNormal = normalize(fsNormal);

  // Eye Direction 
  ////   > eyePos - camera position
	vec3 eyedirVec = normalize(eyePos - fsPosition);


  // Light direction: Spot Light and Point Light are the same
  vec3 lightDirL = normalize(lightPositionL - fsPosition);
  vec3 lightDirR = normalize(lightPositionR - fsPosition);
  vec3 spotLightS = normalize(lightPositionS - fsPosition);


  // Light color

  //// Point Light:
  ////   > LTarget - distance that represents the limit of the high intensty light
  vec3 finalLightColorL = lightColorL * pow(LTarget / length(lightPositionL - fsPosition), LDecay);
  vec3 finalLightColorR = lightColorR * pow(LTarget / length(lightPositionR - fsPosition), LDecay);


  //// Spot Light:
  ////   > lightDirS - direction of the spot d towards which we are lighting the spotlight
  float CosAngle = dot(spotLightS, lightDirS);
  float LCosOut = cos(radians(LConeOut / 2.0));
	float LCosIn = cos(radians(LConeOut * LConeIn / 2.0));
  vec3 finalLightColorS = lightColorS * pow(LTarget / length(lightPositionS - fsPosition), LDecay) *
						clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);

  //Diffuse lambert
	vec3 diffuseLambertL = materialColor * dot(lightDirL,  nNormal);
	vec3 diffuseLambertR = materialColor * dot(lightDirR,  nNormal);
  vec3 diffuseLambertS = materialColor * dot(lightDirS,  nNormal);

  //Phong Specular
  vec3 rL = - reflect(lightDirL, nNormal);
  vec3 rR = - reflect(lightDirR, nNormal);
  vec3 rS = - reflect(lightDirS, nNormal);
  vec3 specularPhongL =  specularColor * pow(clamp(dot(eyedirVec, rL),0.0,1.0), SpecShine);
  vec3 specularPhongR =  specularColor * pow(clamp(dot(eyedirVec, rR),0.0,1.0), SpecShine);
  vec3 specularPhongS =  specularColor * pow(clamp(dot(eyedirVec, rS),0.0,1.0), SpecShine);

  //ambient 
  vec3 ambientAmbient = ambientLightColor * ambColor;    

    

  outColor = vec4(clamp(
 
                          finalLightColorL * (diffuseLambertL + specularPhongL) +
                          finalLightColorR * (diffuseLambertR + specularPhongR) + 
                          finalLightColorS * (diffuseLambertS + specularPhongS) + 
                          ambientAmbient
              ,0.0, 1.0), 1.0); 
}