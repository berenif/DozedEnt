// PlayerSkeletonRenderer - draws simplified bones/joints and ground shadow
export class PlayerSkeletonRenderer {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.pixelScaleX = canvas.width;
    this.pixelScaleY = canvas.height;
    this.boneColor = '#b7d2ff';
    this.jointColor = '#ffffff';
    this.shadowColor = 'rgba(0,0,0,0.15)';
  }

  toCanvas(x, y) {
    return { x: x * this.pixelScaleX, y: y * this.pixelScaleY };
  }

  drawShadow(pelvis) {
    const p = this.toCanvas(pelvis[0], pelvis[1]);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.shadowColor;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 14, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBone(a, b) {
    const p1 = this.toCanvas(a[0], a[1]);
    const p2 = this.toCanvas(b[0], b[1]);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.boneColor;
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  drawJoint(p, r = 5) {
    const c = this.toCanvas(p[0], p[1]);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.fillStyle = this.jointColor;
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Known index map must match C++ order
  // 0 head,1 neck,2 chest,3 mid,4 lower,5 pelvis,
  // 6..13 shoulders/hands, 14..19 hips/ankles, 20..25 feet
  render(snapshot) {
    const j = snapshot.joints;
    if (!j || j.length < 26) {
      return;
    }

    // Shadow under pelvis
    this.drawShadow(j[5]);

    // Torso
    this.drawBone(j[0], j[1]); // head-neck
    this.drawBone(j[1], j[2]); // neck-chest
    this.drawBone(j[2], j[3]); // chest-mid
    this.drawBone(j[3], j[4]); // mid-lower
    this.drawBone(j[4], j[5]); // lower-pelvis

    // Shoulders and arms (L)
    this.drawBone(j[2], j[6]);
    this.drawBone(j[6], j[8]);
    this.drawBone(j[8], j[10]);
    this.drawBone(j[10], j[12]);
    // (R)
    this.drawBone(j[2], j[7]);
    this.drawBone(j[7], j[9]);
    this.drawBone(j[9], j[11]);
    this.drawBone(j[11], j[13]);

    // Hips to knees to ankles (L)
    this.drawBone(j[5], j[14]);
    this.drawBone(j[14], j[16]);
    this.drawBone(j[16], j[18]);
    // Feet (L)
    this.drawBone(j[18], j[20]);
    this.drawBone(j[20], j[22]);
    this.drawBone(j[22], j[24]);

    // (R)
    this.drawBone(j[5], j[15]);
    this.drawBone(j[15], j[17]);
    this.drawBone(j[17], j[19]);
    this.drawBone(j[19], j[21]);
    this.drawBone(j[21], j[23]);
    this.drawBone(j[23], j[25]);

    // Joints
    const important = [0,1,2,3,4,5,14,16,18,20,22,24,15,17,19,21,23,25];
    for (const idx of important) {
      this.drawJoint(j[idx], 4);
    }
  }
}

export default PlayerSkeletonRenderer;


