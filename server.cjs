const express=require("express");
const { Client } = require("pg");
const http=require("http");
const socketio=require("socket.io");
// const socketioClient=require("socket.io-client");
const cors=require("cors");
const sqlite3 = require('sqlite3').verbose();
const app=express();
const server=http.createServer(app);
const axios=require("axios");
const { createClient }=require("@supabase/supabase-js");
const supabaseUrl = 'https://bqgcqatezmtdelrvywka.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2NxYXRlem10ZGVscnZ5d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQxNjI5NjcsImV4cCI6MjAxOTczODk2N30.b8YLKt55jYQ-ScUVNkduIO7fmEN2ryTQmBM9nROHtm0';
const supabase = createClient(supabaseUrl, supabaseKey);
// supabase.from("ai").
// const sql = postgres(connectionString)
// const client = new Client({
//     user: 'seu_usuario',
//     host: 'seu_host',
//     database: 'seu_banco_de_dados',
//     password: 'sua_senha',
//     port: 5432, // porta padrão do PostgreSQL
//   });
const io=socketio(server,{
    cors: {
      origin: '*',
    },
});

const isProduction=process.env.NODE_ENV === 'production';

// const socketClient=socketioClient("http://192.168.3.36:3307");
app.use(express.json());       // Para analisar dados no formato JSON
app.use(express.urlencoded({ extended: true })); // Para analisar dados de formulário HTML
app.use(cors());
// const conn = new Pool({
//     user: 'usuario',
//     host: 'postgres://usuario:HnJ9fumnqY4BhvOURIZ4NTW50pQNpovx@dpg-cm32rjocmk4c73c9h4cg-a.oregon-postgres.render.com/chat_qfa9',
//     database: 'chat_qfa9',
//     password: 'HnJ9fumnqY4BhvOURIZ4NTW50pQNpovx',
//     port: 5432, // Porta padrão do PostgreSQL
//   });
var resolves=[];
async function querySql(databasePath, sql, params = []){
    return new Promise((resolve, reject) => {
        // const db = new sqlite3.Database(__dirname+isProduction ? "/../" : "/"+databasePath+".db");
        
        db.all(sql, params, (err, rows) => {
        db.close();
    
        if (err) {
            reject(err);
        } else {
            resolve(rows);
        }
        });
    });
}
async function queryClient(data){
    const body=data.body;
    const id=data.id;
    const result=await querySql(...body);
    onQueryClient({body:result,id:id});
}
class conn2{
    constructor(dbname){
        this.dbname=dbname;
    }
    query(...params){
        var dbname=this.dbname;
        return new Promise((resolve,reject)=>{
            const now = new Date();
            const id = now.toISOString();
            resolves.push({id:id,resolve:resolve});
            // socketClient.emit("query",{body:[dbname,...params],id:id});
            queryClient({body:[dbname,...params],id:id});
        });
    }
}
function onQueryClient(data){
    for (var i=0;i<resolves.length;i++){
        if (resolves[i].id==data.id){
            resolves[i].resolve(data.body);
            resolves=resolves.filter(resolve=>{ if (resolve.id!=data.id) return resolve});
            break;
        }
    }

}
// socketClient.on("query",(data)=>{
// })
const conn=new conn2("db");
// conn.query("CREATE TABLE IF NOT EXISTS msg(usuario TEXT,chat TEXT,text TEXT,date TEXT)");
// conn.query("CREATE TABLE IF NOT EXISTS users(usuario TEXT,email TEXT,senha TEXT)");
// conn.query("CREATE TABLE IF NOT EXISTS chat(type TEXT,id INT,usuario1 TEXT,usuario2 TEXT)");
// conn.query("DELETE FROM chat");
var status={};
io.on("connection",(socket)=>{
    // conn.query("SELECT * FROM msg WHERE usuario=?",[usuario],(err,result)=>{
    //     socket.emit("msg",result);
    // })
    // socket.emit("msg",[{text:"teste"}]);
    socket.on("infos",(data)=>{
        socket.user=data;
        status[socket.user]="online";
    })
    socket.on("chat",async (id)=>{
        const usuario=socket.user;
        // const resultr=await conn.query("SELECT * FROM chat WHERE id=?",[id]);
        const {data:resultr,error}=await supabase.from("chat").select("*").eq("id",id);
        if (!resultr || resultr.length==0){
            socket.emit("msgs",{error:true});
            return;
        } else {
            // const result=await conn.query("SELECT * FROM msg WHERE chat=?",[id]);
            const {data:result,error}=await supabase.from("msg").select("*").eq("chat",Number(id));
            socket.emit("msgs",{msgs:result});
            const o=resultr[0].usuario1==usuario ? resultr[0].usuario2 : resultr[0].usuario1;
            socket.emit("infos",{status:status[o] || "offline",name:[resultr[0].usuario1,resultr[0].usuario2]});
            socket.join(id);
            socket.to(id).emit("status","online");
        }
    });
    socket.on("quit-chat",async (name)=>{
        io.to(name).emit("status","offline");
        socket.leave(name);
    });
    socket.on("msg",async (data)=>{
        data.room=Number(data.room);
        const date=new Date().toISOString();
        socket.to(data.room).emit("msg",{usuario:data.usuario,text:data.text,date:date});
        // conn.query("INSERT INTO msg(usuario,chat,text,date) VALUES(?,?,?,?)",[data.usuario,data.room,data.text,date]);
        await supabase.from("msg").insert({usuario:data.usuario,chat:data.room,text:data.text,date:date});
    })
    socket.on("isDigiting",(data)=>{
        socket.to(data.room).emit("status",data.isDigiting ? "digitando..." : status[data.usuario]);
    })
});
app.post("/login",async (req,res)=>{
    const data=req.body;
    if (data.type=="login"){
        // var result=await conn.query("SELECT * FROM users WHERE email=? AND senha=?",[data.email,data.password]);
        var { result, error }=await supabase.from("users").select("*").eq("email",data.email).eq("senha",data.password);
        console.log(result,error);
        if (result && result.length>0){
            res.json({result:"true",usuario:result[0].usuario});
        } else {
            res.json({result:"false"});
        }
    } else if (data.type=="cadastro"){
        const usuario=data.user;
        const email=data.email;
        const senha=data.password;
        // var result=await conn.query("SELECT * FROM users WHERE usuario=? OR email=?",[usuario,email]);
        var {data:result,error}=await supabase.from("users").select("*").or(`usuario.eq.${usuario},email.eq.${email}`);
        if (result && result.length>0){
            res.json({result:"false"});
        } else {
            // await conn.query("INSERT INTO users(usuario,email,senha) VALUES(?,?,?)",[usuario,email,senha]);
            await supabase.from("users").insert({usuario:usuario,email:email,senha:senha});
            res.json({result:"true",usuario:data.user});
        }
    }
});
app.post("/convite",async (req,res)=>{
    const data=req.body;
    const usuario=data.usuario;
    const name=data.name;
    if (usuario==name){
        res.json({result:"my"});
    } else {
        // var result=await conn.query("SELECT * FROM users WHERE usuario=?",[name]);
        var {data:result,error}=await supabase.from("users").select("*").eq("usuario",name);
        if (result && result.length>0){
            var sort=[usuario,name].sort();
            // result=await conn.query("SELECT * FROM chat WHERE usuario1=? AND usuario2=?",sort);
            var {data:result,error}=await supabase.from("chat").select("*").eq('usuario1',sort[0]).eq('usuario2',sort[1]);
            console.log(result,error,usuario,name);
            if (result && result.length>0){
                res.json({result:"exists"});
            } else {
                // var id=await conn.query("SELECT id FROM chat ORDER BY id DESC LIMIT 1");
                var {data:id,error}=await supabase.from("chat").select("id").order("id",{ascending:false}).limit(1);
                if (id.length>0){
                    id=id[0].id+1;
                } else {
                    id=1;
                }
                // await conn.query("INSERT INTO chat(type,id,usuario1,usuario2) VALUES(?,?,?,?)",["normal",id,...sort]);
                await supabase.from("chat").insert({type:"normal",id:id,usuario1:sort[0],usuario2:sort[1]});
                res.json({result:"true"});
            }
        } else {
            res.json({result:"false"});
        }
    }
})
app.post("/chats",async(req,res)=>{
    const data=req.body;
    const usuario=data.usuario;
    // const result=await conn.query("SELECT * FROM chat WHERE usuario1=? OR usuario2=?",[usuario,usuario]);
    const {data:result,error}=await supabase.from("chat").select("*").or(`usuario1.eq.${usuario},usuario2.eq.${usuario}`);
    res.json({chats:result});
})
server.listen("4000",(err)=>{
    console.log("rodando");
})
if (isProduction){
    setInterval(()=>{
        axios.get( "https://server-c2zi.onrender.com" )
        .then()
        .catch();
    },60000);
}
// });