
let score=0,best=0,lastGain=0;
function slide(row){
  let a=row.filter(v=>v),out=[],moved=false,merged=[];
  for(let i=0;i<a.length;i++){
    if(a[i]===a[i+1]){
      merged.push(out.length);
      lastGain+=a[i]*2;
      out.push(a[i]*2);score+=a[i]*2;if(a[i]*2>best)best=a[i]*2;i++;
    }
    else out.push(a[i]);
  }
  while(out.length<4)out.push(0);
  moved=out.some((v,i)=>v!==row[i]);
  return [out,moved,merged];
}
const r1=slide([2,2,4,4]);
console.log('r1', JSON.stringify(r1));
if(JSON.stringify(r1[0])!=='[4,8,0,0]') throw 'merge values wrong';
if(JSON.stringify(r1[2])!=='[0,1]') throw 'merge positions wrong: '+JSON.stringify(r1[2]);
const r2=slide([4,4,4,4]);
if(JSON.stringify(r2[0])!=='[8,8,0,0]'||JSON.stringify(r2[2])!=='[0,1]') throw 'double merge wrong';
const r3=slide([0,2,0,2]);
if(JSON.stringify(r3[0])!=='[4,0,0,0]') throw 'squeeze wrong';
if(score!==36) throw 'score wrong: '+score;
console.log('slide logic OK, score='+score);
