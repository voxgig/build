{
  "name": "$$name$$-web",
  "version": "0.1.0",
  "private": true,
  "description": "$$Name$$ SPA: web components on a Seneca service bus",
  "scripts": {
    "postinstall": "node -e \"const fs=require('fs');fs.mkdirSync('public',{recursive:true});for(const p of ['seneca-browser','@voxgig/seneca-browser-store','@voxgig/seneca-browser-debug'])fs.copyFileSync(require.resolve(p),'public/'+p.replace('@voxgig/','')+'.js')\"",
    "dev": "vite",
    "build": "vite build",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "@voxgig/seneca-browser-debug": "^0.1.0",
    "@voxgig/seneca-browser-store": "^0.1.0",
    "seneca-browser": "^8.0.0-rc4",
    "vite": "^7.3.4"
  }
}
