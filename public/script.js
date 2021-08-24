var program;
var gl;
var baseDir;

var positionAttributeLocation,
    matrixLocation,
    textLocation,
    normalAttributeLocation ,
    materialDiffColorHandle,
    lightDirectionHandle,
    lightColorHandle,
    normalMatrixPositionHandle;

var directionalLight,
    directionalLightColor,
    materialColor;

var viewMatrix;

var cx = 0.0, cy=3, cz=2.5, angle=0 , elevation=-30.0;

var delta = 0.2;

async function main() {

  var lastUpdateTime = (new Date).getTime();

  var cubeRx = 0.0;
  var cubeRy = 0.0;
  var cubeRz = 0.0;
  // var cubeS  = 0.0;

  var materialColor = [0.5, 0.5, 0.5];


  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0); 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  defineDirectionalLight();

  //load models
  var cabinet = await loadObject("assets/cabinet.obj");

  getAttributeLocations();

  var perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width/gl.canvas.height, 0.1, 100.0);

  var vao = createVAO(cabinet);

  //////////DO NOT DELETE, GOOD FOR LATER!!!!!///////////////
  // Create a texture.
  var texture = gl.createTexture();
  // use texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // bind to the TEXTURE_2D bind point of texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Asynchronously load an image
  var image = await loadTexture('assets/Mole.png', texture);

  drawScene();

  function animate(){
    var currentTime = (new Date).getTime();
    // if(lastUpdateTime){
    //   var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
    //   cameraRx += deltaC;
    //   cameraRy -= deltaC;
    //   cameraRz += deltaC;
    // }

    viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    ////
    worldMatrix = utils.MakeWorld(  0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);
    normalMatrix = utils.invertMatrix(utils.transposeMatrix(worldMatrix));

    lastUpdateTime = currentTime;               
  }


  function drawScene() {

    // //delete these or put them in animate, when you uncomment animate function call
    // worldMatrix = utils.MakeWorld(  0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);
    // normalMatrix = utils.invertMatrix(utils.transposeMatrix(worldMatrix));

    animate();

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // var viewMatrix = utils.MakeView(0.0, 3.0, 2.5, 0, -30.0);
    var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
    var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);

    // send projection matrix to shaders
    gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

    // send normal matrix to shaders
    gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

    //send info about object and light colors to shader
    gl.uniform3fv(materialDiffColorHandle, materialColor);
    gl.uniform3fv(lightColorHandle,  directionalLightColor);
    gl.uniform3fv(lightDirectionHandle,  directionalLight);

    //BIND TEXTURE
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textLocation, 0);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, cabinet.indices.length, gl.UNSIGNED_SHORT, 0 );
    
  }

  function keyFunction(e){
 
      if (e.keyCode == 37) {  // Left arrow
        cx-=delta;
      }
      if (e.keyCode == 39) {  // Right arrow
        cx+=delta;
      } 
      if (e.keyCode == 38) {  // Up arrow
        cz-=delta;
      }
      if (e.keyCode == 40) {  // Down arrow
        cz+=delta;
      }
      if (e.keyCode == 32) { // Add
        cy+=delta;
      }
      if (e.keyCode == 13) { // Subtract
        cy-=delta;
      }
      
      if (e.keyCode == 65) {  // a
        angle-=delta*10.0;
      }
      if (e.keyCode == 68) {  // d
        angle+=delta*10.0;
      } 
      if (e.keyCode == 87) {  // w
        elevation+=delta*10.0;
      }
      if (e.keyCode == 83) {  // s
        elevation-=delta*10.0;
      }
    
      //If you put it here instead, you will redraw the cube only when the camera has been moved
      window.requestAnimationFrame(drawScene);
  }


  //// 'window' is a JavaScript object (if "canvas", it will not work)
  window.addEventListener("keyup", keyFunction, false);

  window.requestAnimationFrame(drawScene);

}

async function loadTexture(url, texture) {
  var image = new Image();
  image.src = url;

  await image.decode();
  //Make sure this is the active one
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  gl.generateMipmap(gl.TEXTURE_2D);

  return image;
}

function getAttributeLocations() {
  //getAttribute location
  // positionAttributeLocation = gl.getAttribLocation(program, "a_position");  
  uvAttributeLocation = gl.getAttribLocation(program, "a_uv");  
  // matrixLocation = gl.getUniformLocation(program, "matrix");  
  textLocation = gl.getUniformLocation(program, "u_texture");
  positionAttributeLocation = gl.getAttribLocation(program, "inPosition");  
  normalAttributeLocation = gl.getAttribLocation(program, "inNormal");  
  matrixLocation = gl.getUniformLocation(program, "matrix");
  materialDiffColorHandle = gl.getUniformLocation(program, 'mDiffColor');
  lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  lightColorHandle = gl.getUniformLocation(program, 'lightColor');
  normalMatrixPositionHandle = gl.getUniformLocation(program, 'nMatrix');
}

//Create the vertex array that can be used multiple times for drawing the same obj
function createVAO(obj) {
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertices), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertexNormals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(normalAttributeLocation);
  gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  var uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.textures), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(uvAttributeLocation);
  gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW); 

  return vao;
}

function defineDirectionalLight() {
  //define directional light  
  var dirLightAlpha = -utils.degToRad(60);
  var dirLightBeta  = -utils.degToRad(120);

  directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
              Math.sin(dirLightAlpha),
              Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
              ];
  directionalLightColor = [1.0, 1.0, 1.0];
}

async function loadObject(url) {
  var objStr = await utils.get_objstr(url);
  return new OBJ.Mesh(objStr);
}

async function loadShaders() {
  var shaderDir = "shaders/";

  await utils.loadFiles([shaderDir + 'vs.glsl', shaderDir + 'fs.glsl'], function (shaderText) {
    var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
    var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
    program = utils.createProgram(gl, vertexShader, fragmentShader);

  });
  gl.useProgram(program);
}

function setupCanvas() {
  var canvas = document.getElementById("mycanvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
      document.write("GL context not opened");
      return;
  }
}

async function init(){
  
    setupCanvas();

    await loadShaders();
    
    await main();
}




window.onload = init;
