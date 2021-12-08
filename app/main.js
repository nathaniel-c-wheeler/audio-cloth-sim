
var gl;

const WIREFRAME = 1, TRIANGLES = 4
const renderMode = TRIANGLES
const width = height = 7
const spacing = 2
const startpos = vec3(-height * spacing / 2, width * spacing / 2, 0)

window.onload = function init() {
  var canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert("WebGL isn't available"); }

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.depthFunc(gl.LESS);

  //  Load shaders and initialize attribute buffers

  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Load the data into the GPU

  var vertices, indices, mesh;
  mesh = new Mesh(startpos, height, width, spacing, renderMode)

  vertices = mesh.positions
  indices = mesh.indices

  var vertBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(vertices)), gl.DYNAMIC_DRAW);

  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.DYNAMIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  var scale = 15.0;
  var scale_uniform = gl.getUniformLocation(program, "scale");
  gl.uniform1f(scale_uniform, scale);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawElements(renderMode, indices.length, gl.UNSIGNED_SHORT, indexBuffer)

  var mousedown = false;
  var nearest = 0;
  var mouse_x = 0;
  var mouse_y = 0;

  document.onmousemove = function (event) {
    mouse_x = event.x - 10 - (canvas.width / 2);
    mouse_y = -(event.y - 10 - (canvas.height / 2));
    mouse_x = mouse_x * scale / (canvas.width / 2);
    mouse_y = mouse_y * scale / (canvas.height / 2);
    if (mousedown == false) {
      nearest = nearest_point(mesh.positions, mouse_x, mouse_y);
    }
  }

  document.onmousedown = function () {
    mousedown = true;
  }

  document.onmouseup = function () {
    mousedown = false;
    mesh.mouseforce = [-1, vec3(0)]
  }

  var animate = function () {
    window.requestAnimationFrame(animate)
    for (var i = 0; i < 20; i++) {
      mesh.nextStep();
    }
    if (mousedown == true) {
      mesh.addMouseForce(nearest, vec3(mouse_x, mouse_y, 0))
    }
    refresh(mesh, indexBuffer)
  }
  animate()

  /* From my observation, it appears that the upper left corner of the canvas is at
   * (10,10) rather than (0,0), so I'll have to account for that offset in the final calculation.
   * Additionally, the world scale is defined in the shader
   */


}

function distance(x, y, x2, y2) {
  d1 = x - x2;
  d2 = y - y2;
  return Math.sqrt(d1 * d1 + d2 * d2);
}

function nearest_point(vertices, x, y) {

  var near = 0;
  min_dist = 100;
  for (i = 0; i < vertices.length; i++) {
    dist = distance(x, y, vertices[i][0], vertices[i][1])
    if (dist < min_dist) {
      near = i;
      min_dist = dist;
    }
  }

  return near;

}

refresh = function (mesh, indexBuffer) {
  gl.clear(gl.COLOR_BUFFER_BIT);
  vertices = mesh.positions
  indices = mesh.indices

  // Associate out shader variables with our data buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(vertices)), gl.DYNAMIC_DRAW);
  gl.drawElements(renderMode, indices.length, gl.UNSIGNED_SHORT, indexBuffer)

};
