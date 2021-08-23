
var canvas;
var gl = null,
  program = null;

var projectionMatrix,
  perspectiveMatrix,
  viewMatrix,
  worldMatrix, vao, matrixLocation;
var lastUpdateTime = (new Date).getTime();
//Camera parameters
// var cx = 0.5;
// var cy = 0.0;
// var cz = 1.0;
// var elevation = 0.0;
// var angle = -30.0;

var delta = 0.1;
var flag = 0;

//Cube parameters
// var cubeTx = 0.0;
// var cubeTy = 0.0;
// var cubeTz = -1.0;
var cubeRx = 0.0;
var cubeRy = 0.0;
var cubeRz = 0.0;
// var cubeS = 0.5;

var cubeNormalMatrix;
var cubeWorldMatrix;    //One world matrix for each cube...

//define directional light  
var dirLightAlpha = -utils.degToRad(60);
var dirLightBeta  = -utils.degToRad(120);

var directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
            Math.sin(dirLightAlpha),
            Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
            ];
var directionalLightColor = [0.1, 1.0, 1.0];

  //Define material color
var cubeMaterialColor = [0.5, 0.5, 0.5];
var lastUpdateTime = (new Date).getTime();

var cubeWorldMatrix = utils.MakeWorld( -3.0, 0.0, -1.5, 0.0, 0.0, 0.0, 0.5);


function main() {

  // Get the canvas and grab a WebGL context
  canvas = document.getElementById("mycanvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("GL context not opened");
    return;
  }

  // autoResizeCanvas(canvas);
  utils.resizeCanvasToDisplaySize(gl.canvas);

  var aspectRatio = gl.canvas.width/gl.canvas.height;
  //Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  //Clear the canvas
  gl.clearColor(0.85, 0.85, 0.85, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);


  // you have to declare them here because you use them to send data to GPU
  //x,y for each vertex with aspect ratio correction
  // var positions = [
  //       0.2, 0.1,
  //       0.5, 0.9,
  //       0.8, 0.7
  // ];

  // var colours = [
  //   0.0, 1.0, 0.0,
  //   0.0, 0.0, 1.0,
  //       1.0, 0.0, 0.0,

  // ];

  //   //******Initialisation of color uniforms variables******/
  // var colour = [252.0/255.0, 186.0/255.0, 3.0/255.0];
  // var colour_choice = 0.0;
  // var second_colour = [29.0/255.0, 219.0/255.0];

  //positions for indexing: 
  //x,y for each vertex
  // var positionsInd = [
  //       0.0, 0.0,
  //       0.5, 0.9,
  //       0.9, 0.0,
  //       0.5, -0.9,
  //       -0.5,-0.9,
  //       -0.9, 0.0,
  //       -0.5, 0.9,
  // ];


  // create GLSL shaders, upload the GLSL source, compile the shaders and link them
  var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  program = utils.createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);


  // look up where the vertex data needs to go.
  // var positionAttributeLocation = gl.getAttribLocation(program, "a_position");  
  // var colorAttributeLocation = gl.getAttribLocation(program, "a_color");  
  var positionAttributeLocation = gl.getAttribLocation(program, "inPosition");  
  var normalAttributeLocation = gl.getAttribLocation(program, "inNormal");  
  var matrixLocation = gl.getUniformLocation(program, "matrix");
  var materialDiffColorHandle = gl.getUniformLocation(program, 'mDiffColor');
  var lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  var lightColorHandle = gl.getUniformLocation(program, 'lightColor');
  var normalMatrixPositionHandle = gl.getUniformLocation(program, 'nMatrix');

  // we create the perspective matrix only once because the perspective won't change
  perspectiveMatrix = utils.MakePerspective(90, aspectRatio, 0.1, 100.0);
  viewMatrix = utils.MakeView(3.0, 3.0, 2.5, -45.0, -40.0);



  // Create a vertex array object (attribute state) - for drawing the same object multiple times, like in multiple frames
  vao = gl.createVertexArray();
  // and make it the one we're currently working with
  gl.bindVertexArray(vao);
    
  // Create a buffer and put three 2d clip space points in it
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionAttributeLocation);
  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  // 3 components per iteration
  // don't normalize the data
  // 0 = move forward stride * sizeof(type) each iteration to get the next position
  // start at the beginning of the buffer
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  // colorBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  // gl.enableVertexAttribArray(colorAttributeLocation);
  // //params similar to top
  // gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);


  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW); 

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(normalAttributeLocation);
  gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);


  // // Tell it to use our program (pair of shaders)
  // gl.useProgram(program);


  //    //******Retrieving the uniforms locations******/
  // var colourLocation = gl.getUniformLocation(program, "u_colour");
  // var colourChoiceLocation = gl.getUniformLocation(program, "colour_choice");
  // var secondColourLocation = gl.getUniformLocation(program, "u_second_colour");


  // //******Passing all the uniforms******/
  // gl.uniform3fv(colourLocation, colour);
  // gl.uniform1f(colourChoiceLocation, colour_choice);
  // gl.uniform2fv(secondColourLocation, second_colour);


  // //Draw call triangle
  // var primitiveType = gl.TRIANGLES;
  // var offset = 0;
  // var count = 3;
  // gl.drawArrays(primitiveType, offset, count);


  //   ////////////// INDEX BUFFER
  // //Create the buffer that will hold the indices and send the data
  // var indices = [0,1,2,0,2,3,0,3,4,0,4,5,0,5,6,0,6,1];
  // var indexBuffer = gl.createBuffer();
  // //Here the buffer must be gl.ELEMENT_ARRAY_BUFFER to specify it contains indices
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


  // //draw cube in perspective

  // //Perspective matrix - instead of world matrix
  // //params: FoVy (field of view, angle at the top of the frustum, aspect ratio, near plane distance, far plane distance
  // var perspectiveMatrix = utils.MakePerspective(90, aspectRatio, 0.1, 100.0);
  // console.log(perspectiveMatrix);

  // //View Matrix - sets position of the camera and moves the model in camera space (eye coords)
  // //params: camera position x, y, z, elevation (on x axis), angle (on y axis)
  // var viewMatrix = utils.MakeView(0.5, 0.0, 1.0, 0.0, -30.0);
  // console.log(viewMatrix);

  // //Projection matrix - how the scene is perceived by the camera.
  // var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);
  
  // // Set a the color as uniform. Pay attention! this line must be after "useProgram" otherwise
  // //webgl is not able to find the colorLocation, and then to set its value 
  // gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix)); 

  // //make the index buffer the active one
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // //drawElements uses the indices to draw the primitives
  // gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0 );
  //Indexed array buffer


  drawScene();  

  function animate() {
    var currentTime = (new Date).getTime();
    if(lastUpdateTime){
      var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
      cubeRx += deltaC;
      cubeRy -= deltaC;
      cubeRz += deltaC;
    }



    // //create world matrix for animated cube. needs to be done once per frame
    // //Just with the MakeWorld function which implicitly multiplies the scaling and translation matrices
    // worldMatrix = utils.MakeWorld(
    //   //transpose
    //   cubeTx, cubeTy, cubeTz,
    //   //rotate
    //   cubeRx, cubeRy, cubeRz,
    //   //scale
    //   cubeS);

    cubeWorldMatrix = utils.MakeWorld( 0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);

    cubeNormalMatrix = utils.invertMatrix(utils.transposeMatrix(cubeWorldMatrix));

    lastUpdateTime = currentTime;
  }

function drawScene() {
    animate();

    //repeat clearing the view and setting up the canvas, as well as using the program
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);
    // gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    // gl.bindVertexArray(vao);

    // change this when you update the view (the position of the camera or the angles)
    // var viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    // perspective * view * world (we have to multiply them in the opposite order)
    var projectionMatrix = utils.multiplyMatrices(viewMatrix, cubeWorldMatrix);
    projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, projectionMatrix);

    // set projection matrix
    gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

    //set normal matrix
    gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(cubeNormalMatrix));

    //set info about object and light colors:
    gl.uniform3fv(materialDiffColorHandle, cubeMaterialColor);
    gl.uniform3fv(lightColorHandle,  directionalLightColor);
    gl.uniform3fv(lightDirectionHandle,  directionalLight);


    // //bind buffer for drawing cube using indices
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.bindVertexArray(vao);

    // draw cube
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    //The requestAnimationFrame function tells the browser to call the specified function before the next repaint
    //so that we can update the rendered image with the latest changes
    window.requestAnimationFrame(drawScene);
  }

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
      if (e.keyCode == 171) { // Add
        cy+=delta;
      }
      if (e.keyCode == 173) { // Subtract
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


//Call the main function once the html has finished loading
window.onload = main;

//// 'window' is a JavaScript object (if "canvas", it will not work)
// window.addEventListener("keyup", keyFunction, false);