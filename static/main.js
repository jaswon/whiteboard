var socket = io();

function redraw (model, ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineCap = 'round'
  for (var id in model) { // for each user
    for (var i = 0 ; i < model[id].length ; ++i) { // for each stroke
      var cs = model[id][i] // stroke info
      ctx.lineWidth = cs[0]
      ctx.strokeStyle = cs[1]
      ctx.beginPath()
      ctx.moveTo(cs[2],cs[3])
      for (var j = 4 ; j < model[id][i].length ; j+=2) ctx.lineTo(cs[j],cs[j+1])
      ctx.stroke()
    }
  }
}

swal({
  title: "Welcome to whiteboard.",
  text: "Enter your room code",
  type: "input",
  confirmButtonText: "Join room",
  cancelButtonText: "Create new room",
  showCancelButton: true,
  closeOnConfirm: false,
  closeOnCancel: false,
  showLoaderOnConfirm: true,
  animation: "slide-from-top"
},
function(inputValue){
  socket.on("createroom", function(data) {
    if (data) {
      swal({
        title: "Your room name is: "+data,
        text: "Enjoy!",
        type: "success"
      }, function() {
        board(data)
      });
    } else {
      swal.showInputError("You're already in a room!");
    }
  })

  socket.on("joinroom", function(data) {
    if (data) {
      swal({
        title: "Room "+data+" joined!",
        type: "success"
      }, function() {
        board(data)
      });
    } else {
      swal.showInputError("That room doesn't exist!");
    }
  })

  if (inputValue === false) {
    socket.emit("createroom")
  } else {
    socket.emit("joinroom", inputValue)
  }
});

function board(name) {
  const cvs = document.querySelector('#whiteboard')
  const ctx = cvs.getContext('2d')
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
  ctx.lineCap = 'round'

  // initialize hud
  const hud = document.querySelector("#hud")

  // hud title
  document.querySelector('#title').innerHTML = name

  // pen weight controller
  var weight = document.createElement('div')
  weight.className = 'weight-container'
  weight.value = 10
  var track = document.createElement('div')
  track.className = 'weight-track'
  var thumb = document.createElement('div')
  thumb.className = 'weight-thumb'
  var preview = document.createElement('div')
  preview.className = 'weight-preview'
  preview.style.width = weight.value+'px'
  preview.style.height = weight.value+'px'
  preview.style.borderRadius = weight.value/2+'px'
  thumb.appendChild(preview)
  weight.appendChild(track)
  weight.appendChild(thumb)
  weight.addEventListener('mouseover', function(e) {
    thumb.style.marginLeft = weight.value + 'px'
  })
  weight.addEventListener('mouseout', function(e) {
    thumb.style.marginLeft = 0
  })
  weight.addEventListener('mousemove', function(e) {
    if (e.buttons) {
      weight.value = Math.max(0,Math.min(180, e.clientX-weight.offsetLeft-40))
      thumb.style.marginLeft = weight.value + 'px'
      preview.style.width = (weight.value*49/180+1)+'px'
      preview.style.height = (weight.value*49/180+1)+'px'
      preview.style.borderRadius = (weight.value*49/180+1)/2+'px'
    }
  })

  hud.appendChild(weight)

  // color picker controller
  const colors = ["#000","#f00","#00f","#0f0","magenta","#fff"]
  var palette = document.createElement('div')
  palette.setAttribute('data-current','#000')
  for (var i = 0 ; i < colors.length ; ++i) {
    var color = document.createElement('button')
    color.className = 'palette'
    color.style.backgroundColor = colors[i]
    color.onclick = function() {
      palette.setAttribute('data-current',this.style.backgroundColor)
    }
    palette.appendChild(color)
  }
  hud.appendChild(palette)

  // clear screen controller
  var clear = document.createElement("button")
  clear.className = 'btn btn-danger btn-sm'
  clear.innerHTML = 'Clear Screen'
  clear.onclick = function(e) {
    swal({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, kill it!"
    },
    function() { socket.emit("update",-2) });
  }
  hud.appendChild(clear)

  // undo controller
  var undo = document.createElement("button")
  undo.className = 'btn btn-sm'
  undo.innerHTML = 'Undo'
  undo.onclick = function(e) {
    socket.emit('update',-1)
    socket.emit('update',-1)
  }
  hud.appendChild(undo)



  var down = false
  var lastx = 0
  var lasty = 0

  var userstack = {}

  document.addEventListener('mousedown', function(e) {
    if (e.button == 0) {
      down = true
      lastx = e.clientX
      lasty = e.clientY
      socket.emit('update', 0)
      socket.emit('update', [weight.value , palette.getAttribute('data-current'), lastx, lasty])
    }
  })

  document.addEventListener('mouseup', function(e) {
    down = false
  })

  document.addEventListener('mousemove', function(e) {
    if (down && (Math.abs(e.clientX - lastx) || Math.abs(e.clientY - lasty) )) {
      socket.emit('update', [e.clientX, e.clientY])
    }
  })

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key == 'z') { // handle undo stroke
      e.preventDefault()
      socket.emit('update',-1)
    }
  })

  socket.on('update', function(data) {
    // update model
    if (!(data.id in userstack)) userstack[data.id] = []
    var sq = userstack[data.id]
    if (data.data == 0) { // new stroke
      sq.push([])
    } else if (data.data == -1) { // undo
      if (!down) { // only undo if not drawing
        sq.pop()
        redraw(userstack, ctx)
      }
    } else if (data.data == -2) { // clear screen
      userstack = {}
      down = false
      redraw(userstack, ctx)
    } else { // continuing stroke
      sq[sq.length-1] = sq[sq.length-1].concat(data.data)
      var cs = sq[sq.length-1]
      if (data.data.length == 2) { // segment info
        ctx.lineWidth = cs[0]
        ctx.strokeStyle = cs[1]
        ctx.beginPath()
        ctx.moveTo(cs[cs.length-4],cs[cs.length-3])
        ctx.lineTo(cs[cs.length-2],cs[cs.length-1])
        ctx.stroke()
      }
    }
  })
}
