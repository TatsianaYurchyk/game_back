import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
const app = express();

import route from "./routes.js";
// import addUser from './users.js';
// import findUser from './users.js';
// import getRoomUsers from './users.js';
// import removeUser from './users.js';
// const { addUser, findUser, getRoomUsers, removeUser } = require("./users");
// import addUser from "./users.js"
import { trimStr } from "./util/trim.js";

let users = [];

const findUser = (user) => {
  const userName = trimStr(user.name);
  const userRoom = trimStr(user.room);

  return users.find(
    (u) => trimStr(u.name) === userName && trimStr(u.room) === userRoom
  );
};

const addUser = (user) => {
  const isExist = findUser(user);

  !isExist && users.push(user);

  const currentUser = isExist || user;

  return { isExist: !!isExist, user: currentUser };
};

const getRoomUsers = (room) => users.filter((u) => u.room === room);

const removeUser = (user) => {
  const found = findUser(user);

  if (found) {
    users = users.filter(
      ({ room, name }) => room === found.room && name !== found.name
    );
  }

  return found;
};



app.use(cors({ origin: "*" }));
app.use(route);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }) => {
    socket.join(room);

    const { user, isExist } = addUser({ name, room });

    const userMessage = isExist
      ? `${user.name} is in game`
      : `  ${user.name}  welcome to the game!`;

    socket.emit("message", {
      data: { user: { name: "Admin" }, message: userMessage },
    });

    socket.broadcast.to(user.room).emit("message", {
      data: { user: { name: "Admin" }, message: `${user.name} has joined the game` },
    });

    io.to(user.room).emit("room", {
      data: { users: getRoomUsers(user.room) },
    });
  });

  socket.on("sendMessage", ({ message, params }) => {
    const user = findUser(params);

    if (user) {
      io.to(user.room).emit("message", { data: { user, message } });
    }
  });

  socket.on("leftRoom", ({ params }) => {
    const user = removeUser(params);

    if (user) {
      const { room, name } = user;

      io.to(room).emit("message", {
        data: { user: { name: "Admin" }, message: `${name} has left the game` },
      });

      io.to(room).emit("room", {
        data: { users: getRoomUsers(room) },
      });
    }
  });

  io.on("disconnect", () => {
    console.log("Disconnect");
  });
});
const port = 7000;
server.listen(port, () => {
  console.log("Server is running on port:" +port);
});

