const express=require("express");
const http=require("http");
const socketio=require("socket.io");
const sqlite3 = require('sqlite3').verbose();
const app=express();
const server=http.createServer(app);
const io=socketio(server);
function query(databasePath, sql, params = []) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(databasePath);
  
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
io.on("connection",(socket)=>{
    socket.on("query",async (data)=>{
    })
})
server.listen("3307",(err)=>{
    console.log("rodando");
})