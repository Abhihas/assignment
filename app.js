const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
let bcrypt = require("bcrypt");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");
let jwt = require("jsonwebtoken");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running ");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register/", async (request, response) => {
  const { username, name, password, gender } = request.body;
  let lengthofPass = password.length;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  console.log(lengthofPass);
  if (lengthofPass < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    if (dbUser === undefined) {
      const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}'
        )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("User already exists");
    }
  }
});

//login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    console.log(isPasswordMatched);

    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//middleware
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
const convertDbObjectToResponseObject = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

//get
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const getPlayersQuery = `
 SELECT
 *
 FROM
 follower inner join tweet ON follower.follower_user_id=tweet.user_id
 order by strftime("%H",date_time) ASC
 limit ${4}
 
 
 ;`;
  const playersArray = await db.all(getPlayersQuery);

  response.send(
    playersArray.map((eachPlayer) =>
      convertDbObjectToResponseObject(eachPlayer)
    )
  );
});
const convertDbObjectToResponseObject1 = (dbObject) => {
  return {
    name: dbObject.name,
  };
};

//get particular id
app.get("/user/following/", authenticateToken, async (request, response) => {
  const getPlayersQuery = `
 SELECT
 *
 FROM
 user;`;
  const playersArray = await db.all(getPlayersQuery);

  response.send(
    playersArray.map((eachPlayer) =>
      convertDbObjectToResponseObject1(eachPlayer)
    )
  );
});

module.exports = app;
