const express=require("express");
const { Client } = require("pg");
const http=require("http");
const socketio=require("socket.io");
// const socketioClient=require("socket.io-client");
const cors=require("cors");
const sqlite3 = require('sqlite3').verbose();
const axios=require("axios");
const {PeerServer}=require("peer");
const { createClient }=require("@supabase/supabase-js");
const supabaseUrl = 'https://bqgcqatezmtdelrvywka.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2NxYXRlem10ZGVscnZ5d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQxNjI5NjcsImV4cCI6MjAxOTczODk2N30.b8YLKt55jYQ-ScUVNkduIO7fmEN2ryTQmBM9nROHtm0';
const supabase = createClient(supabaseUrl, supabaseKey);
const app=express();
const server=http.createServer(app);
const peer=PeerServer({port:9000,path:"/peerjs/peerjs"});
// const peerServer = ExpressPeerServer(server, {
//     debug: true,
//     path: '/peerjs', // Define o caminho para o servidor de sinalização PeerJS
// });
// app.use("/peerjs",peerServer);
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
    var user;
    var call_id;
    // conn.query("SELECT * FROM msg WHERE usuario=?",[usuario],(err,result)=>{
    //     socket.emit("msg",result);
    // })
    // socket.emit("msg",[{text:"teste"}]);
    
    socket.on("call",async (data)=>{
        const id=Number(data);
        const {data:result,error}=await supabase.from("chat").select("usuario1,usuario2").eq("id",id);
        const usuario2=result[0]["usuario1"]==user ? result[0]["usuario2"] : result[0]["usuario1"];
        // const id=result[0]["id"];
        if (status[usuario2]){
            // socket.join(id);
            socket.join(usuario2);
            socket.to(usuario2).emit("call",id);
            socket.leave(usuario2);
            // s
        };
    })
    socket.on("infos",async (data)=>{
        user=data;
        socket.join(user);
        status[user]="online";
        const {data:result,error}=await supabase.from("chat").select("id").or(`usuario1.eq.${user},usuario2.eq.${user}`);
        if (result.length>0){
            result.forEach(res=>{
                const id=res.id;
                socket.join(id);
                const size=io.sockets.adapter.rooms.get(id)?.size || 0;
                size==3 && socket.to(id).emit("status","online");
                socket.leave(id);
            })
        }
    })
    socket.on("chat",async (ids)=>{
        const usuario=user;
        const id=Number(ids);
        // const resultr=await conn.query("SELECT * FROM chat WHERE id=?",[id]);
        const {data:resultr,error}=await supabase.from("chat").select("*").eq("id",id);
        if (!resultr || resultr.length==0){
            socket.emit("msgs",{error:true});
            return;
        } else {
            // const result=await conn.query("SELECT * FROM msg WHERE chat=?",[id]);
            const usuario2=resultr[0].usuario1==usuario ? resultr[0].usuario2 : resultr[0].usuario1;
            await supabase.from("msg").update({visualization:new Date().toISOString()}).eq("chat",Number(id)).eq("usuario",usuario2).eq("visualization",false);
            const {data:result,error}=await supabase.from("msg").select("*").eq("chat",Number(id)).order("id",{ascending:true});
            socket.emit("msgs",{msgs:result});
            socket.emit("infos",{status:status[usuario2] || "offline",name:[resultr[0].usuario1,resultr[0].usuario2]});
            socket.join(id);
        }
    });
    socket.on("quit-chat",async (name)=>{
        // io.to(name).emit("status","offline");
        socket.leave(Number(name));
    });
    socket.on("msg",async (data)=>{
        data.room=Number(data.room);
        const date=new Date().toISOString();
        // const chat_id=data.chat_id;
        // conn.query("INSERT INTO msg(usuario,chat,text,date) VALUES(?,?,?,?)",[data.usuario,data.room,data.text,date]);
        const {data:result,error}=await supabase.from("msg").select("chat_id").eq("chat",data.room).order("id",{ascending:false}).limit(1);
        const chat_id=result.length > 0 ? Number(result[0]["chat_id"])+1 : 1;
        socket.to(data.room).emit("msg",{chat_id:chat_id,usuario:data.usuario,text:data.text,date:date});
        await supabase.from("msg").insert({visualization:false,chat_id:chat_id,usuario:data.usuario,chat:data.room,text:data.text,date:date});
        // socket.to(data.room).emit("visualization-msg",{date})
    })
    socket.on("isDigiting",(data)=>{
        status[data.usuario]=data.isDigiting ? "digitando..." : "online";
        socket.to(data.room).emit("status",status[data.usuario]);
    })
    socket.on("visualization-msg",async (data)=>{
        data.chat=Number(data.chat);
        const visualization=new Date().toISOString();
        await supabase
            .from("msg")
            .update({visualization:visualization})
            .eq("chat",data.chat)
            .eq("chat_id",data.chat_id);
        socket.to(data.chat).emit("visualization-msg",{chat_id:data.chat_id,visualization:visualization});
    })
    socket.on("disconnect",async ()=>{
        delete status[user];
        const {data:result,error}=await supabase.from("chat").select("id").or(`usuario1.eq.${user},usuario2.eq.${user}`);
        if (result.length>0){
            result.forEach(res=>{
                const id=res.id;
                socket.join(id);
                const size=io.sockets.adapter.rooms.get(id)?.size || 0;
                size==3 && socket.to(id).emit("status","offline");
                socket.leave(id);
            })
        }
        socket.leave(user);
    });
});
app.post("/login",async (req,res)=>{
    const data=req.body;
    if (data.type=="login"){
        // var result=await conn.query("SELECT * FROM users WHERE email=? AND senha=?",[data.email,data.password]);
        var { data:result, error }=await supabase.from("users").select("*").eq("email",data.email).eq("senha",data.password);
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
app.get("/",(req,res)=>{
    res.send("oi");
});
// app.get("/a", async(req,res)=>{
//     // const {data:result,error}=await supabase.from("msg").select("*");
//     // for (var i=1;i<result.length+1;i++){
//     //     const chats=new
//     //     // const date=result[i-1]["date"];
//     //     await supabase.from("msg").update({chat_id:chat_id}).eq("chat").eq("id",);
//     // }
//     const chs=[1,2,3,4];
//     for (var ch of chs){
//         const {data:result,error}=await supabase.from("msg").select("*").eq("chat",ch);
//         var ui=0;
//         for (var rs of result){
//             ui++;
//             await supabase.from("msg").update({chat_id:ui}).eq("id",rs.id);
//         }
//     }
//     res.send("bom");
// })
server.listen("4000",(err)=>{
    console.log("rodando");
})
if (isProduction){
    setInterval(async ()=>{
        try{
            await axios.get( "https://server-c2zi.onrender.com" )
        } catch(error){

        }
    },60000);
}
// });