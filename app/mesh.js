const spaceVec = (inputVec, direction, amount) => {
  var retVec = inputVec;
  retVec[0] += direction[0] * amount;
  retVec[1] -= direction[1] * amount;
  retVec[2] += direction[2] * amount;
  return retVec;
}

const addVec = (vec1, vec2) => {
  return vec1.map((x, i) => x + vec2[i]);
}

const diffVec = (vec1, vec2) => {
  return vec1.map((x, i) => x - vec2[i]);
}

const scaleVec = (vec1, s) => {
  return vec1.map(x => x * s);
}

const lengthVec = (vec) => {
  return Math.sqrt(vec.reduce((acc, val) => val * val + acc, 0))
}

class Mesh {
  constructor(st, h, w, sp, mode) {
    this.startpos = st
    this.height = h;
    this.width = w;
    this.spacing = sp
    this.x_spacing = scaleVec(vec3(1., 0, 0), sp);
    this.y_spacing = scaleVec(vec3(0, 1., 0), sp);
    this.k_struct = 500;
    this.k_shear = 25;
    this.k_bend = 250;
    this.damping = 5
    this.invMass = 1 / 10;
    this.mouseforce = [-1, vec3(0)]

    this.velocities = []
    this.isFixed = []
    this.positions = this.setupMesh();
    this.forces = this.calculateForces();
    console.log(this.forces)
    console.log(this.positions)
    this.time = 0;
    this.step = .005;
    if (mode == 1)
      this.indices = this.meshToWireframe()
    else if (mode == 4)
      this.indices = this.meshToTriangles()


    this.oscPort = new osc.WebSocketPort({
      url: "ws://localhost:8081"
    });
    this.oscPort.open()

  };

  setupMesh() {
    var v = [];
    for (var i = 0; i < this.height; i++) {
      v[i * this.width] = spaceVec(vec4(this.startpos), this.y_spacing, i);
      this.velocities[i * this.width] = vec3(0.0);
      this.isFixed[i * this.width] = 0;
      for (var j = 1; j < this.width; j++) {
        v[(i * this.width) + j] = spaceVec(vec4(v[i * this.width]), this.x_spacing, j);
        this.velocities[(i * this.width) + j] = vec3(0);
        this.isFixed[i * this.width] = 0
      }
    }
    this.isFixed[0] = 1;
    v[0][2] -= 5;
    v[this.width - 1][2] -= 5;
    this.isFixed[this.width - 1] = 1;
    return v;
  }

  meshToWireframe() {
    var indices = []
    for (var i = 0; i < this.height - 1; i++) {
      for (var j = 0; j < this.width - 1; j++) {
        var a, b, c, d
        a = (i * this.width) + j
        b = (i * this.width) + j + 1
        c = ((i + 1) * this.width) + j
        d = ((i + 1) * this.width) + j + 1
        indices.push(a)
        indices.push(b)
        indices.push(a)
        indices.push(c)
        indices.push(a)
        indices.push(d)
        indices.push(b)
        indices.push(c)
      }
      //Right side
      indices.push((i + 1) * this.width - 1)
      indices.push((i + 2) * this.width - 1)
    }

    //Bottom row
    for (var j = 0; j < this.width - 1; j++) {
      indices.push((this.height - 1) * this.width + j)
      indices.push((this.height - 1) * this.width + j + 1)
    }
    return indices;
  }

  meshToTriangles() {
    var indices = []
    for (var i = 0; i < this.height - 1; i++) {
      for (var j = 0; j < this.width - 1; j++) {
        var a, b, c, d
        a = (i * this.width) + j
        b = (i * this.width) + j + 1
        c = ((i + 1) * this.width) + j
        d = ((i + 1) * this.width) + j + 1
        indices.push(a)
        indices.push(b)
        indices.push(c)
        indices.push(b)
        indices.push(c)
        indices.push(d)
      }
    }
    return indices;
  }

  getRelPartID(id, off_x, off_y) {
    return id + off_x + (off_y * width);
  }

  addMouseForce(index, mousepos) {
    var tmp = scaleVec(diffVec(mousepos, this.positions[index]), 30)
    tmp[2] = 0;
    this.mouseforce = [index, tmp];
  }

  forceBetween(id1, id2, k, spacing) {
    var pos1 = this.positions[id1]
    var pos2 = this.positions[id2]
    var diff = diffVec(pos1, pos2)
    var dist = lengthVec(diff)
    var normDiff = scaleVec(diff, spacing / dist)
    var force = scaleVec(diffVec(normDiff, diff), k)
    return force
  }

  calculateForces() {
    var forces = []
    var i = 0;
    const k_struct = this.k_struct;
    const k_shear = this.k_shear;
    const k_bend = this.k_bend;
    const spacing = this.spacing;
    while (i < this.width * this.height) {
      var allForces = [vec3(0, -9.81, 0)]

      if (this.mouseforce[0] == i) {
        allForces.push(this.mouseforce[1])
      }
      //Structural
      //Check left
      if (i % width > 0)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, -1, 0), k_struct, spacing))
      //Check right
      if ((i + 1) % width > 0)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 1, 0), k_struct, spacing))
      //Check top
      if (Math.floor(i / width) > 0)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 0, -1), k_struct, spacing))
      //Check bottom
      if (Math.floor(i / width) < height - 1)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 0, 1), k_struct, spacing))

      //Shear
      //Check top-left
      if (i % width > 0 && Math.floor(i / width) > 0)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, -1, -1), k_shear, spacing * .707 * 2))
      //Check top-right
      if ((i + 1) % width > 0 && Math.floor(i / width) > 0)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 1, -1), k_shear, spacing * .707 * 2))
      //Check bottom-left
      if (i % width > 0 && Math.floor(i / width) < height - 1)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, -1, 1), k_shear, spacing * .707 * 2))
      //Check bottom-right
      if ((i + 1) % width > 0 && Math.floor(i / width) < height - 1)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 1, 1), k_shear, spacing * .707 * 2))

      //Bend
      //Check left
      if (i % width > 1)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, -2, 0), k_bend, spacing * 2))
      //Check right
      if ((i + 2) % width > 1)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 2, 0), k_bend, spacing * 2))
      //Check top
      if (Math.floor(i / width) > 1)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 0, -2), k_bend, spacing * 2))
      //Check bottom
      if (Math.floor(i / width) < height - 2)
        allForces.push(this.forceBetween(i, this.getRelPartID(i, 0, 2), k_bend, spacing * 2))

      const netForce = allForces.reduce(addVec, vec3(0))
      forces[i] = netForce
      i++;
    }
    return forces;
  }

  nextStep() {
    const oldForces = this.forces.slice();
    this.forces = this.calculateForces();
    var newPositions = [];
    var newVelocities = [];
    for (var i = 0; i < this.width * this.height; i++) {
      if (this.isFixed[i]) {
        newPositions.push(this.positions[i]);
        newVelocities.push(this.velocities[i]);
        continue
      }

      var dampedForce = diffVec(this.forces[i], scaleVec(this.velocities[i], this.damping));

      var oldAcl = scaleVec(oldForces[i], this.invMass)
      var newAcl = scaleVec(dampedForce, this.invMass)
      var newVel = addVec(scaleVec(addVec(newAcl, oldAcl), this.step / 2), this.velocities[i])
      var newPos = addVec(scaleVec(newVel, this.step), this.positions[i])
      newPos = addVec(newPos, scaleVec(oldAcl, .5 * this.step * this.step))

      if (lengthVec(newVel) > 3)
        this.oscPort.send({ address: "/osc/vel", args: [(i % 110) + ""] })
      if (lengthVec(newAcl) > 50)
        this.oscPort.send({ address: "/osc/acl", args: [((i + 8) % 90) + ""] })
      if (newAcl[0] > 20)
        this.oscPort.send({ address: "/osc/aclx", args: [i + ""] })
      if (newAcl[1] > 20)
        this.oscPort.send({ address: "/osc/acly", args: [i + ""] })

      newPositions.push(newPos)
      newVelocities.push(newVel)
    }

    for (var i = 0; i < this.width * this.height; i++) {
      this.positions[i] = vec4(newPositions[i])
      this.velocities[i] = newVelocities[i]
    }
  }

};
