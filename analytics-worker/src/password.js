const encoder=new TextEncoder();
const ITERATIONS=100000;
const PREFIX='pbkdf2-sha512-2x';
const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
const unhex=value=>Uint8Array.from(value.match(/.{2}/g)||[],pair=>parseInt(pair,16));

const cleanPassword=password=>typeof password==='string'&&password.length>=6&&password.length<=128&&!/[\u0000-\u001f\u007f]/.test(password);
export const validPassword=password=>cleanPassword(password)&&password.length>=10;
export const validStudentPassword=password=>cleanPassword(password)&&password.length<=10;

async function derive(password,salt,iterations){
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-512'},key,256));
}
async function deriveTwice(password,salt,iterations){
  const first=await derive(password,salt,iterations);
  const key=await crypto.subtle.importKey('raw',first,'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-512'},key,256));
}

export async function createPasswordHash(password){
  if(!cleanPassword(password))throw Error('Invalid password');
  const salt=crypto.getRandomValues(new Uint8Array(16));
  return `${PREFIX}$${ITERATIONS}$${hex(salt)}$${hex(await deriveTwice(password,salt,ITERATIONS))}`;
}

export async function verifyPassword(password,stored){
  if(typeof password!=='string'||password.length>128||typeof stored!=='string')return false;
  const parts=stored.split('$');
  if(parts.length!==4||parts[0]!==PREFIX||!/^\d{5,7}$/.test(parts[1])||!/^[0-9a-f]{32}$/.test(parts[2])||!/^[0-9a-f]{64}$/.test(parts[3]))return false;
  const expected=unhex(parts[3]),actual=await deriveTwice(password,unhex(parts[2]),Number(parts[1]));
  let difference=0;for(let i=0;i<expected.length;i++)difference|=expected[i]^actual[i];
  return difference===0;
}
