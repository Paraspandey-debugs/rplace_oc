const { exec } = require('child_process')
const path = require('path')

const backupDir = path.join(__dirname, '..', 'backups')
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
const backupPath = path.join(backupDir, `backup-${timestamp}`)

exec(`mongodump --db rplace_oc --out ${backupPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`)
    return
  }
  if (stderr) {
    console.error(`Backup stderr: ${stderr}`)
  }
  console.log(`Backup successful: ${backupPath}`)
  console.log(stdout)
})