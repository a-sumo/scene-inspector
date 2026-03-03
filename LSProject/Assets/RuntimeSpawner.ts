/**
 * RuntimeSpawner — Creates objects at runtime using MeshBuilder.
 * Pre-runtime objects (Ground, Pillar, Marker) are in the LS hierarchy.
 * Runtime objects ONLY appear in the inspector.
 * Attach to the Scene root. Assign a Material in the inspector.
 */

@component
export class RuntimeSpawner extends BaseScriptComponent {
  @input
  @hint("Material for spawned objects")
  public material: Material;

  @input
  @hint("Seconds between spawning a new object")
  public spawnInterval: number = 3;

  @input
  @hint("Max runtime objects alive at once")
  public maxBlocks: number = 6;

  private container: SceneObject;
  private spawned: SceneObject[] = [];
  private elapsed: number = 0;
  private lastSpawnTime: number = 0;
  private spawnCount: number = 0;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      print("[RuntimeSpawner] onStart fired");
      try {
        this.container = global.scene.createSceneObject("[Spawned]");
        this.spawnBox("Cube_A", new vec3(-8, 2, -5), new vec3(3, 3, 3));
        this.spawnSphere("Orb_A", new vec3(8, 5, 5), new vec3(2, 2, 2));
        this.spawnBox("Cube_B", new vec3(-4, 8, 2), new vec3(2, 4, 2));
        print("[RuntimeSpawner] Ready — 3 initial runtime objects");
      } catch (e) {
        print("[RuntimeSpawner] ERROR in onStart: " + e);
      }
    });

    this.createEvent("UpdateEvent").bind(() => {
      if (!this.container) return;
      this.elapsed += getDeltaTime();
      this.trySpawn();
      this.cleanup();
    });
  }

  private makeBoxMesh(): RenderMesh {
    var builder = new MeshBuilder([
      { name: "position", components: 3 },
      { name: "normal", components: 3, normalized: true },
    ]);
    builder.topology = MeshTopology.Triangles;
    builder.indexType = MeshIndexType.UInt16;

    var h = 0.5;
    var V: number[][] = [
      [-h,-h,-h], [h,-h,-h], [h,h,-h], [-h,h,-h],
      [-h,-h, h], [h,-h, h], [h,h, h], [-h,h, h],
    ];
    var faces: number[][] = [
      [0,1,2,3, 0,0,-1], [5,4,7,6, 0,0,1],
      [4,0,3,7, -1,0,0], [1,5,6,2, 1,0,0],
      [3,2,6,7, 0,1,0],  [4,5,1,0, 0,-1,0],
    ];
    for (var fi = 0; fi < faces.length; fi++) {
      var f = faces[fi];
      var i0=f[0], i1=f[1], i2=f[2], i3=f[3];
      var nx=f[4], ny=f[5], nz=f[6];
      builder.appendVerticesInterleaved([
        V[i0][0],V[i0][1],V[i0][2], nx,ny,nz,
        V[i1][0],V[i1][1],V[i1][2], nx,ny,nz,
        V[i2][0],V[i2][1],V[i2][2], nx,ny,nz,
        V[i3][0],V[i3][1],V[i3][2], nx,ny,nz,
      ]);
    }
    var idx: number[] = [];
    for (var i = 0; i < 6; i++) {
      var b = i * 4;
      idx.push(b, b+1, b+2, b, b+2, b+3);
    }
    builder.appendIndices(idx);
    builder.updateMesh();
    return builder.getMesh();
  }

  private makeSphereMesh(): RenderMesh {
    var seg = 10;
    var builder = new MeshBuilder([
      { name: "position", components: 3 },
      { name: "normal", components: 3, normalized: true },
    ]);
    builder.topology = MeshTopology.Triangles;
    builder.indexType = MeshIndexType.UInt16;

    var verts: number[] = [];
    for (var lat = 0; lat <= seg; lat++) {
      var theta = lat * Math.PI / seg;
      var sinT = Math.sin(theta);
      var cosT = Math.cos(theta);
      for (var lon = 0; lon <= seg; lon++) {
        var phi = lon * 2.0 * Math.PI / seg;
        var nx = sinT * Math.cos(phi);
        var ny = cosT;
        var nz = sinT * Math.sin(phi);
        verts.push(nx * 0.5, ny * 0.5, nz * 0.5, nx, ny, nz);
      }
    }
    builder.appendVerticesInterleaved(verts);

    var idx: number[] = [];
    for (var lat = 0; lat < seg; lat++) {
      for (var lon = 0; lon < seg; lon++) {
        var a = lat * (seg + 1) + lon;
        var b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    builder.appendIndices(idx);
    builder.updateMesh();
    return builder.getMesh();
  }

  private spawnBox(name: string, pos: vec3, scale: vec3) {
    var obj = global.scene.createSceneObject(name);
    obj.setParent(this.container);
    obj.getTransform().setLocalPosition(pos);
    obj.getTransform().setLocalScale(scale);
    var visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    visual.mesh = this.makeBoxMesh();
    if (this.material) visual.mainMaterial = this.material;
    this.spawned.push(obj);
    print("[RuntimeSpawner] Spawned " + name);
  }

  private spawnSphere(name: string, pos: vec3, scale: vec3) {
    var obj = global.scene.createSceneObject(name);
    obj.setParent(this.container);
    obj.getTransform().setLocalPosition(pos);
    obj.getTransform().setLocalScale(scale);
    var visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    visual.mesh = this.makeSphereMesh();
    if (this.material) visual.mainMaterial = this.material;
    this.spawned.push(obj);
    print("[RuntimeSpawner] Spawned " + name);
  }

  private trySpawn() {
    if (this.elapsed - this.lastSpawnTime < this.spawnInterval) return;
    this.lastSpawnTime = this.elapsed;
    this.spawnCount++;
    var isCube = this.spawnCount % 2 === 0;
    var name = isCube ? "Cube_" + this.spawnCount : "Orb_" + this.spawnCount;
    var x = (Math.random() - 0.5) * 20;
    var y = 2 + Math.random() * 10;
    var z = (Math.random() - 0.5) * 15;
    var s = 1.5 + Math.random() * 2;
    if (isCube) {
      this.spawnBox(name, new vec3(x, y, z), new vec3(s, s, s));
    } else {
      this.spawnSphere(name, new vec3(x, y, z), new vec3(s, s, s));
    }
  }

  private cleanup() {
    while (this.spawned.length > this.maxBlocks) {
      var oldest = this.spawned.shift();
      if (oldest) oldest.destroy();
    }
  }
}
