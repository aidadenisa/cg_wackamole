var program;
var gl;
var baseDir;

var positionAttributeLocation,
    positionAttributeLocation,
    matrixLocation,
    textLocation;

async function main() {

  var lastUpdateTime = (new Date).getTime();

  var cubeRx = 0.0;
  var cubeRy = 0.0;
  var cubeRz = 0.0;
  var cubeS  = 0.5;

  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0); 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);


  //load models
  var cabinet = await loadObject("assets/cabinet.obj");

  getAttributeLocations();

  var perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width/gl.canvas.height, 0.1, 100.0);

  var vao = createVAO(cabinet);

  // // Create a texture.
  // var texture = gl.createTexture();
  // // use texture unit 0
  // gl.activeTexture(gl.TEXTURE0);
  // // bind to the TEXTURE_2D bind point of texture unit 0
  // gl.bindTexture(gl.TEXTURE_2D, texture);

  // Asynchronously load an image
  // var image = new Image();
  // image.src = "assets/crate.png";
  // image.onload = function() {
  //     //Make sure this is the active one
  //     gl.activeTexture(gl.TEXTURE0);
  //     gl.bindTexture(gl.TEXTURE_2D, texture);
  //     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
  //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  //     gl.generateMipmap(gl.TEXTURE_2D);
  //   };

  drawScene();

  function animate(){
    var currentTime = (new Date).getTime();
    if(lastUpdateTime){
      var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
      cubeRx += deltaC;
      cubeRy -= deltaC;
      cubeRz += deltaC;
    }
    worldMatrix = utils.MakeWorld(  0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);
    lastUpdateTime = currentTime;               
  }


  function drawScene() {

    worldMatrix = utils.MakeWorld(  0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);

    // animate();

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    var viewMatrix = utils.MakeView(1.5, 0.0, 3.0, 0.0, -30.0);

    var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
    var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);
   
    gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
    
    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, texture);
    // gl.uniform1i(textLocation, 0);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, cabinet.indices.length, gl.UNSIGNED_SHORT, 0 );
    
    // window.requestAnimationFrame(drawScene);
  }
}

function getAttributeLocations() {
  //getAttribute location
  positionAttributeLocation = gl.getAttribLocation(program, "a_position");  
  uvAttributeLocation = gl.getAttribLocation(program, "a_uv");  
  matrixLocation = gl.getUniformLocation(program, "matrix");  
  textLocation = gl.getUniformLocation(program, "u_texture");
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

  // var normalBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  // gl.enableVertexAttribArray(normalAttributeLocation);
  // gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  // var uvBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.textures), gl.STATIC_DRAW);
  // gl.enableVertexAttribArray(uvAttributeLocation);
  // gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW); 

  return vao;
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
