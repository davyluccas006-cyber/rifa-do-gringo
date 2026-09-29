import express from "express";
import Database from "better-sqlite3";
import path from "path";
import {fileURLToPath} from "url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"troque-esta-senha";
const db=new Database(process.env.DB_FILE||path.join(__dirname,"../data/rifa.db"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS cotas (numero TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'disponivel', updated_at TEXT)`);
const count=db.prepare("SELECT COUNT(*) c FROM cotas").get().c;
if(count===0){
  const ins=db.prepare("INSERT INTO cotas(numero,status) VALUES (?, 'disponivel')");
  const tx=db.transaction(()=>{for(let i=0;i<100000;i++) ins.run(String(i).padStart(5,"0"));});
  tx();
}
app.use(express.json());
app.use(express.static(path.join(__dirname,"../public")));

app.get("/api/cotas", (req,res)=>{
  const rows=db.prepare("SELECT numero,status FROM cotas ORDER BY RANDOM() LIMIT 1200").all();
  const stats=db.prepare("SELECT SUM(status='comprada') compradas, SUM(status='disponivel') disponiveis FROM cotas").get();
  res.json({cotas:rows,stats});
});
app.get("/api/buscar/:numero",(req,res)=>{
  const n=String(req.params.numero).replace(/\D/g,"").slice(0,5).padStart(5,"0");
  const row=db.prepare("SELECT numero,status FROM cotas WHERE numero=?").get(n);
  res.json(row||{numero:n,status:"inexistente"});
});
app.post("/api/admin/login",(req,res)=>{
  if(req.body?.password===ADMIN_PASSWORD) return res.json({ok:true,token:Buffer.from(ADMIN_PASSWORD).toString("base64")});
  res.status(401).json({ok:false});
});
function auth(req,res,next){
  if(req.headers.authorization===`Bearer ${Buffer.from(ADMIN_PASSWORD).toString("base64")}`) return next();
  res.status(401).json({error:"Não autorizado"});
}
app.get("/api/admin/cotas",auth,(req,res)=>{
  const q=String(req.query.q||"").replace(/\D/g,"").slice(0,5);
  const rows=q?db.prepare("SELECT numero,status,updated_at FROM cotas WHERE numero LIKE ? LIMIT 100").all(q+"%")
              :db.prepare("SELECT numero,status,updated_at FROM cotas WHERE status='comprada' ORDER BY numero LIMIT 100").all();
  res.json(rows);
});
app.post("/api/admin/confirmar",auth,(req,res)=>{
  const n=String(req.body?.numero||"").replace(/\D/g,"").slice(0,5).padStart(5,"0");
  const result=db.prepare("UPDATE cotas SET status='comprada',updated_at=datetime('now') WHERE numero=? AND status='disponivel'").run(n);
  if(!result.changes) return res.status(409).json({ok:false,error:"Cota inexistente ou já comprada."});
  res.json({ok:true,numero:n});
});
app.post("/api/admin/liberar",auth,(req,res)=>{
  const n=String(req.body?.numero||"").replace(/\D/g,"").slice(0,5).padStart(5,"0");
  const result=db.prepare("UPDATE cotas SET status='disponivel',updated_at=datetime('now') WHERE numero=? AND status='comprada'").run(n);
  if(!result.changes) return res.status(409).json({ok:false,error:"Cota não está comprada."});
  res.json({ok:true,numero:n});
});
app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"../public/admin.html")));
app.listen(PORT,()=>console.log(`Rifa do Gringo: http://localhost:${PORT}`));
