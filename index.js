const express = require('express')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs')

const rooms = {}

const nameGen = (function*() {
  var animals = fs.readFileSync('animals.txt').toString().split('\n')
  var colors = fs.readFileSync('colors.txt').toString().split('\n')
  while (true) {
    var pot = colors[Math.floor(Math.random()*colors.length)]+animals[Math.floor(Math.random()*animals.length)]
    if (!(pot in rooms)) yield pot
  }
})()

app.use(express.static('static'))

app.get('/board', function(req,res){
  res.sendFile(__dirname + '/static/index.html');
})

io.on('connection', function(socket){
  socket.on('joinroom', function(id) {
    if (rooms[id]) {
      socket.join(id)
      socket.room = id
      socket.emit("joinroom", id)
    } else socket.emit("joinroom", 0)
  })
  socket.on('createroom', function() {
    if (socket.room) {
      socket.emit("createroom", 0)
    } else {
      var id = nameGen.next().value
      socket.join(id)
      socket.room = id
      rooms[id] = true
      socket.emit('createroom',id)
    }
  })
  socket.on('disconnect', function() {
    if (!(socket.room in io.sockets.adapter.rooms)) delete rooms[socket.room]
  })
  socket.on('update', function(data) {
    io.to(socket.room).emit('update', {
      id: socket.id,
      data: data
    })
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});


/*
todo:

cursor
voice chat
shared screen size


*/
