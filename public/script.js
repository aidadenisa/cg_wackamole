var program;
var gl;
var baseDir;

var animateIndicator = {}; //indicating active animations of hammers or moles
var animateFrameRate = 30; //frame rate of screen
var moveHammerAnimTimeAsSec = 0.3; //animation duration as sec
var hammerRotation = -40; //currently hammer rotation
var hammerStepRotation; //angular change in each frame rate step
var animateStepIndicator = {"mole":0,"hammer":0}; //holding currently frame rate steps
var animatingMoles={"1":false,"2":false,"3":false,"4":false,"5":false}; //mole is visible or not
var currentAnimatingMole;
var animationMovementCoordinates = {"mole":{"x":0,"y":0,"z":0},"hammer":{"x":0,"y":0,"z":0}}; //target coordinates of animation
var animateStatus = {}; //status of animation trigger
var isGameStarted = false;
var score=0; //holding score

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
var lastUpdateTime=(new Date).getTime();
var viewMatrix;
var cx = 0.0, cy=3, cz=2.5, angle=0 , elevation=-30.0;
var delta = 0.2;

//example taken from webGLTutorial2
var Node = function() {
  this.children = [];
  this.localMatrix = utils.identityMatrix();
  this.worldMatrix = utils.identityMatrix();
};

Node.prototype.setParent = function(parent) {
  // remove us from our parent
  if (this.parent) {
    var ndx = this.parent.children.indexOf(this);
    if (ndx >= 0) {
      this.parent.children.splice(ndx, 1);
    }
  }

  // Add us to our new parent
  if (parent) {
    parent.children.push(this);
  }
  this.parent = parent;
};

Node.prototype.updateWorldMatrix = function(matrix) {
  if (matrix) {
    // a matrix was passed in so do the math
    this.worldMatrix = utils.multiplyMatrices(matrix, this.localMatrix);
  } else {
    // no matrix was passed in so just copy.
    utils.copy(this.localMatrix, this.worldMatrix);
  }

  // now process all the children
  var worldMatrix = this.worldMatrix;
  this.children.forEach(function(child) {
    child.updateWorldMatrix(worldMatrix);
  });
};


async function main() {
  var lastUpdateTime = (new Date).getTime();

  var materialColor = [0.5, 0.5, 0.5];

  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  defineDirectionalLight();

  //load models
  var cabinet = await loadObject("assets/cabinet.obj");
  var mole = await loadObject("assets/mole.obj");
  var hammer = await loadObject("assets/hammer.obj");

  getAttributeLocations();

  var perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width/gl.canvas.height, 0.1, 100.0);

  var vaoCabinet = createVAO(cabinet);
  var vaoMole = createVAO(mole);
  var vaoHammer = createVAO(hammer);

  // list of objects to render
  var objects = defineSceneGraph();

  // Create a texture.
  var texture = gl.createTexture();
  // use texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // bind to the TEXTURE_2D bind point of texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Asynchronously load the texture
  var image = await loadTexture('assets/Mole.png', texture);

  drawScene();

  function drawScene() { //// DRAW THE LIST OF OBJECTS

   viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    for(var i=0; i<objects.length; i++) {
      var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, objects[i].localMatrix);
      var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);

      var normalMatrix = utils.invertMatrix(utils.transposeMatrix(objects[i].localMatrix));

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

      gl.bindVertexArray(objects[i].drawInfo.vertexArray);
      gl.drawElements(gl.TRIANGLES, objects[i].drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0 );
    }
    mainAnimate();
    window.requestAnimationFrame(drawScene);
  }

  function moveMole(){ // function for movement of moles
    if(animateStepIndicator["mole"] == 0){ // checking mole movements is started
      var randomer =Math.floor(Math.random() * 5) + 1;
      animatingMoles[randomer] = !animatingMoles[randomer];
      currentAnimatingMole = randomer;
    }
    if(animatingMoles[currentAnimatingMole]){ // mole is visible
      objects[currentAnimatingMole].localMatrix[7]+=((0.85-0)/(animateFrameRate*moveHammerAnimTimeAsSec)); // mole moving to visible side
    }else{
      objects[currentAnimatingMole].localMatrix[7]-=((0.85-0)/(animateFrameRate*moveHammerAnimTimeAsSec));
    }
    if(animateStepIndicator["mole"] == animateFrameRate*moveHammerAnimTimeAsSec){ // movement is done
      animateStepIndicator["mole"] = -1;
    }
    animateStepIndicator["mole"]++;
  }
  function mainAnimate(){ // main animate function calling every frame of screen
    if(animateStatus["hammer"] == true){
      moveHammer();
    }
    if(animateStatus["mole"] == true){
      moveMole();
    }
  }
  function animationTrigger(type,i){ // change animation statuses of moles and hammer
    if(type=="hammer"){
        animateStatus["hammer"] = true;
        animateIndicator["hammer"] = i;
        animateStepIndicator["hammer"] = 0;
    }else if(type=="mole"){
        animateStatus["mole"] = true;
        animateIndicator["mole"] = i;
        animateStepIndicator["mole"] = 0;
    }
  }
  function moveHammer(){ // animation hammer
    world=objects[6].localMatrix;

    if(animateStepIndicator["hammer"] == 0){ // beginning of movement
      hammerStepRotation = (-80-(hammerRotation))/(animateFrameRate*moveHammerAnimTimeAsSec); // calculating rotation degree foreach frame
      animationMovementCoordinates["hammer"]["x"] = (objects[animateIndicator["hammer"]].localMatrix[3]-world[3])/(animateFrameRate*moveHammerAnimTimeAsSec); // calculating translation foreach frame
      animationMovementCoordinates["hammer"]["y"] = (1-world[7])/(animateFrameRate*moveHammerAnimTimeAsSec);
      animationMovementCoordinates["hammer"]["z"] = (objects[animateIndicator["hammer"]].localMatrix[11]-world[11])/(animateFrameRate*moveHammerAnimTimeAsSec);
    }else if(animateStepIndicator["hammer"] == animateFrameRate*moveHammerAnimTimeAsSec){ // moving to mole is done
      if(objects[animateIndicator["hammer"]].localMatrix[7] > 0.5){ // mole is visible, animateIndicator["hammer"] indicates the number of mole
        score++;
        document.getElementById("score").innerHTML = score;
        if(currentAnimatingMole == animateIndicator["hammer"]){
          animateStepIndicator["mole"] = 0;
        }
        objects[animateIndicator["hammer"]].localMatrix[7] = 0; // forces to mole down
        animatingMoles[animateIndicator["hammer"]] = false;
      }
      hammerStepRotation = (-40-(hammerRotation))/(animateFrameRate*moveHammerAnimTimeAsSec); // calculating rotation degree for reverse path
      animationMovementCoordinates["hammer"]["x"]=(0.7-world[3])/(animateFrameRate*moveHammerAnimTimeAsSec);
      animationMovementCoordinates["hammer"]["y"]=(1.5-world[7])/(animateFrameRate*moveHammerAnimTimeAsSec);
      animationMovementCoordinates["hammer"]["z"]=(1.3-world[11])/(animateFrameRate*moveHammerAnimTimeAsSec);
    }

    world[3]+=animationMovementCoordinates["hammer"]["x"];
    world[7]+=animationMovementCoordinates["hammer"]["y"];
    world[11]+=animationMovementCoordinates["hammer"]["z"];

    if(animateStepIndicator["hammer"] == animateFrameRate*moveHammerAnimTimeAsSec*2) animateStatus["hammer"] = false; // when the movement is done, change animatestatus of hammer to false
    hammerRotation += hammerStepRotation; // updating hammer rotating in each steps
    rotate=utils.MakeRotateXMatrix(hammerStepRotation); //rotation calcs
    itrans=utils.multiplyMatrices(rotate,utils.invertMatrix(utils.MakeTranslateMatrix(world[3],world[7],world[11])));
    trans=utils.multiplyMatrices(utils.MakeTranslateMatrix(world[3],world[7],world[11]),itrans);
    world=utils.multiplyMatrices(trans,world);
    objects[6].localMatrix=world; // assigning of hammer localmatrix to the new matrix
    animateStepIndicator["hammer"]++;
  }

  function defineSceneGraph() {
    var objects = [];
    //positions for moles: y=1.0 up; y<0.5 down
    //cabinet node - root
    var cabinetNode = new Node();
    cabinetNode.localMatrix = utils.MakeWorld(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);
    cabinetNode.drawInfo = {
      bufferLength: cabinet.indices.length,
      vertexArray: vaoCabinet
    }
    objects.push(cabinetNode);

    var initialX = -0.965;
    var initialY = 0.0;
    //var initialZ = 0.0;

    for(i = 0; i<5; i++)
    {
      var initialZ = ((i%2) * 0.455)+0.2;
      initialX += 0.32;
      var moleNode = new Node();
      moleNode.localMatrix = utils.MakeWorld(initialX, initialY, initialZ, 0.0, 0.0, 0.0, 1.0);
      moleNode.drawInfo = {
        bufferLength: mole.indices.length,
        vertexArray: vaoMole
      }
      moleNode.setParent(cabinetNode);
      objects.push(moleNode);
    }
    var hammerNode = new Node();
    hammerNode.localMatrix = utils.MakeWorld(0.7, 1.5, 1.3, 0.0,-40.0,-45, 1);
    hammerNode.drawInfo = {
      bufferLength: hammer.indices.length,
      vertexArray: vaoHammer
    }
    hammerNode.setParent(cabinetNode);
    objects.push(hammerNode);
    return objects;
  }

  function keyFunction(e){
      if (isGameStarted != true) return;
      if (e.keyCode == 37) {  // Left arrow
        cx-=delta;
      }
      else if (e.keyCode == 39) {  // Right arrow
        cx+=delta;
      }
      else if (e.keyCode == 38) {  // Up arrow
        cz-=delta;
      }
      else if (e.keyCode == 40) {  // Down arrow
        cz+=delta;
      }
      else if (e.keyCode == 32) { // Add
        cy+=delta;
      }
      else if (e.keyCode == 13) { // Subtract
        cy-=delta;
      }
      else if (e.keyCode == 65) {  // a
        angle-=delta*10.0;
      }
     else if (e.keyCode == 68) {  // d
        angle+=delta*10.0;
      }
      else if (e.keyCode == 87) {  // w
        elevation+=delta*10.0;
      }
      else if (e.keyCode == 83) {  // s
        elevation-=delta*10.0;
      }
      else if (e.keyCode == 49) {  // 1
        animationTrigger("hammer",1); // hammer animation trigger to mole 1
      }
      else if (e.keyCode == 50) {  // 2
        animationTrigger("hammer",2);
      }
      else if (e.keyCode == 51) {  // 3
        animationTrigger("hammer",3);
      }
      else if (e.keyCode == 52) {  // 4
        animationTrigger("hammer",4);
      }
      else if (e.keyCode == 53) {  // 5
        animationTrigger("hammer",5);
      }
      //If you put it here instead, you will redraw the cube only when the camera has been moved
      //window.requestAnimationFrame(drawScene);
  }

  //// 'window' is a JavaScript object (if "canvas", it will not work)
  window.addEventListener("keyup", keyFunction, false);
window.addEventListener('click', event => { // game is starting and restarting after click
    if(event.target.closest("#action-button")){
        if(isGameStarted == true){
          score = 0;
          document.getElementById("score").innerHTML = "0";
        }else{
          isGameStarted = true;
          animationTrigger("mole",1);
          document.getElementById("action-button").innerHTML = "RESTART";
        }
    }
  });
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