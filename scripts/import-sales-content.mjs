import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const [campaignFile,uploadedFile]=process.argv.slice(2)
if(!campaignFile||!uploadedFile)throw new Error('Usage: node scripts/import-sales-content.mjs campaign.json uploaded.json')
const posts=JSON.parse(fs.readFileSync(campaignFile,'utf8'))
const uploads=JSON.parse(fs.readFileSync(uploadedFile,'utf8'))
const target=path.join(root,'public/sales/content')
fs.mkdirSync(target,{recursive:true})
const assets={}
let count=0
for(const post of posts){
  if(post.draft_status==='archived_original_preserved')continue
  for(const file of post.files){
    const media=uploads[file]
    if(!media?.id||!/^[a-f0-9-]{36}$/.test(media.id))throw new Error('Missing upload identity: '+file)
    const source=path.resolve(path.dirname(campaignFile),file)
    const bytes=fs.readFileSync(source)
    const digest=crypto.createHash('sha256').update(bytes).digest('hex')
    if(digest!==media.file_sha256)throw new Error('Source differs from verified upload: '+file)
    if(assets[media.id])throw new Error('Duplicate media identity: '+media.id)
    const destination=path.join(target,media.id+'.jpg')
    if(fs.existsSync(destination)&&!fs.readFileSync(destination).equals(bytes))throw new Error('Refusing to replace a different asset: '+media.id)
    fs.writeFileSync(destination,bytes)
    assets[media.id]='/sales/content/'+media.id+'.jpg'
    count++
  }
}
fs.writeFileSync(path.join(root,'src/data/salesContentAssets.ts'),'// Official HD sales kit assets, keyed by stable media identity.\n// The copy survives social-platform archival; never match by carousel position alone.\nexport const salesContentAssets: Record<string, string> = '+JSON.stringify(assets,null,2)+'\n')
console.log(JSON.stringify({imported_hd_images:count,posts:posts.filter(p=>p.draft_status!=='archived_original_preserved').length}))
