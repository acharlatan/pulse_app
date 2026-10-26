// Run after a clean production build. Only static files and public guides enter the ZIP.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(process.env.PULSE_DIST || 'dist');
const output = path.resolve('.codex/distribution');
fs.mkdirSync(output, { recursive: true });
const zip = path.join(output, 'pulse-1.0.0-rc.1-static.zip');
execFileSync('python', ['-c', `import os,sys,zipfile,hashlib,json
root,out=sys.argv[1:]
allowed={'.js','.css','.html','.png','.svg','.webmanifest'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for folder,dirs,files in os.walk(root):
  for name in files:
   p=os.path.join(folder,name)
   if os.path.splitext(name)[1] not in allowed: raise ValueError('Unexpected build file: '+name)
   if os.path.islink(p): raise ValueError('No symlinks allowed')
   z.write(p,os.path.relpath(p,root))
 for name in ['LICENSE','INSTALLATION.md','BACKUP_AND_RECOVERY.md','GETTING_STARTED.md','CHANGELOG.md']:
  z.write(name,'docs/'+name)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 names=z.namelist()
 assert 'index.html' in names and 'sw.js' in names
open(out+'.sha256','w').write(hashlib.sha256(open(out,'rb').read()).hexdigest()+'  '+os.path.basename(out)+'\\n')
print(json.dumps({'files':len(names),'bytes':os.path.getsize(out),'sha256':hashlib.sha256(open(out,'rb').read()).hexdigest()}))`, root, zip], { stdio: 'inherit' });
