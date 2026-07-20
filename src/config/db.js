const mongoose = require("mongoose")



function connectToDB() {

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("server is connected to DB")
        })
        .catch(err => {
            console.log("Error connecting to DB")
            process.exit(1)
        })

}


module.exports = connectToDB





//|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||





// const mongoose = require("mongoose")



// function connectToDB () {

//     mongoose.connect(process.env.MONGO_URI)

//     .then(() => {
//         console.log("server is connected to DB");
//     })

//     .catch(err => {
//     console.error(err.message);
//     process.exit(1);
// })
     
// }

// console.log("MONGO_URI =", process.env.MONGO_URI);

// module.exports = connectToDB



 