const router = require("express").Router();
const {ensureAuthenticated} = require("../config/auth");
const User = require("../model/User");
const History = require("../model/History");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const path = require("path");
const commaFunc = require("../utils/comma");

router.get("/dashboard", ensureAuthenticated, (req,res) => {
    try{
        return res.render("dashboard", {pageTitle: "Dashbaord", req, commaFunc});
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/profile", ensureAuthenticated, (req,res) => {
    try{
        return res.render("profile", {pageTitle: "Profile", req});
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/verify", ensureAuthenticated, (req,res) => {
    try{
        return res.render("verify", {pageTitle: "Verify", req});
    }catch(err){
        return res.redirect("/");
    }
});

router.post("/verify", ensureAuthenticated, async(req,res) => {
    try{
        const {doc_type} = req.body;
        if(!doc_type){
            req.flash("error_msg", "Please select document type");
            return res.redirect("/verify");
        };
        if (!req.files || Object.keys(req.files).length === 0) {
            req.flash("error_msg", "Please upload a document");
            return res.redirect("/verify");
        }
        await User.updateOne({_id:req.user.id}, {
            verify_status: "pending"
        });
        req.flash("success_msg", "Document uploaded and is pending approval.");
        return res.redirect("/verify");
    }catch(err){
        console.log(err);
        req.flash("error_msg", "internal server error.");
        return res.redirect("/verify");
    }
});

router.get("/notification", ensureAuthenticated, (req,res) => {
    try{
        return res.render("notifications", {pageTitle: "Notification", req});
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/deposit", ensureAuthenticated, (req,res) => {
    try{
        return res.render("deposit", {pageTitle: "Deposit Funds", req});
    }catch(err){
        return res.redirect("/");
    }
});

router.post("/deposit", ensureAuthenticated, (req,res) => {
    try{
        const {amount, proof} = req.body;
        if(!amount){
            req.flash("error_msg", "Please enter amount to withdraw");
            return res.redirect("/deposit");
        }

        let proof_img;
        let uploadPath;
        const filename = uuid.v4();

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.render("signup", {...req.body,error_msg:"Please upload a passport photograph", pageTitle: "Signup"});
        }

        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        proof_img = req.files.proof;
        const filenames = proof_img.name.split(/\./);
        const ext = filenames[filenames.length-1];
        const imageName = filename + "." + ext;
        uploadPath = path.join(__dirname, "../public/uploads/") + imageName;

        // Use the mv() method to place the file somewhere on your server
        proof_img.mv(uploadPath, async(err) => {
            if (err){
                console.log(err);
                req.flash("error_msg", "Error uploading image");
                return res.redirect("/deposit");
            }
            const newHist = {
                amount,
                userID: req.user.id,
                user: req.user,
                type: "deposit",
                status: "pending",
                proof: imageName
            };
            const _newHist = new History(newHist);
            await _newHist.save();
            req.flash("success_msg", "Success, your deposit is pending approval.");
            return res.redirect("/deposit");
        });
    }catch(err){
        console.log(err);
        req.flash("error_msg", "internal server error.");
        return res.redirect("/deposit");
    }
});

router.get("/withdraw", ensureAuthenticated, (req,res) => {
    try{
        return res.render("withdraw", {pageTitle: "Withdraw Funds", req});
    }catch(err){
        return res.redirect("/");
    }
});

router.post("/withdraw", ensureAuthenticated, async (req,res) => {
    try{
        const {amount, pin, address} = req.body;
        if(!amount || !pin){
            req.flash("error_msg", "Please enter all fields to withdraw");
            return res.redirect("/withdraw");
        }
        if(req.user.balance < amount || amount < 0){
            req.flash("error_msg", "Insufficient balance. try and deposit.");
            return res.redirect("/withdraw");
        }
        if(pin != 4567){
            req.flash("error_msg", "You have entered an incorrect PIN");
            return res.redirect("/withdraw");
        }
        if(req.user.verify_status !== 'verified'){
            req.flash("error_msg", "Please verify your account to enable withdrawer.");
            return res.redirect("/withdraw");   
        }
        if(req.user.debt > 0){
            req.flash("error_msg", "You can't withdraw because you still have to deposit $" + req.user.debt);
            return res.redirect("/withdraw");
        }
        else{
            const newHist = {
                amount,
                userID: req.user.id,
                user: req.user,
                type: "withdraw",
                status: "pending",
                address: address || "Null"
            };
            const _newHist = new History(newHist);
            await _newHist.save();
            req.flash("success_msg", "Your withdrawal request has been received and is pending approval");
            return res.redirect("/withdraw");
        }
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/transacts", ensureAuthenticated, async (req,res) => {
    try{
        const history = await History.find({userID: req.user.id});
        return res.render("history", {pageTitle: "Transactions", history, req});
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/pending_withdraw", ensureAuthenticated, async (req,res) => {
    try{
        const history = await History.find({userID: req.user.id, type:"withdraw"});
        return res.render("pendingWithdrawals", {pageTitle: "Pending Withdraw", history, req});
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/pending_deposit", ensureAuthenticated, async (req,res) => {
    try{
        const history = await History.find({userID: req.user.id, type:"deposit"});
        return res.render("pendingDeposit", {pageTitle: "Pending Deposit", history, req});
    }catch(err){
        return res.redirect("/");
    }
});

router.get("/settings", ensureAuthenticated, (req,res) => {
    try{
        return res.render("settings", {pageTitle: "Account Settings", req});
    }catch(err){
        return res.redirect("/");
    }
});

router.post("/update-personal", ensureAuthenticated, async (req,res) => {
    try{
        const {fullname, email, password, password2} = req.body;

        console.log(req.body)

        if(!fullname || !email){
            req.flash("error_msg", "Provide fullname and email");
            return res.redirect("/settings");
        }

        if(password){
            if(password.length < 6){
                req.flash("error_msg", "Password is too short");
                return res.redirect("/settings");
            }
            if(password != password2){
                req.flash("error_msg", "Password are not equal");
                return res.redirect("/settings");
            }
        }

        const update = {
            fullname,
            email
        }

        if(password){
            const salt = await bcrypt.genSalt();
            const hash = await bcrypt.hash(password2, salt);
            update.password = hash;
        }

        await User.updateOne({_id: req.user.id}, update);
        req.flash("success_msg", "Account updated successfully")
        return res.redirect("/settings");

    }catch(err){

    }
});

router.post("/update-payment", ensureAuthenticated, async (req,res) => {
    try{
        const {bitcoin, accountName, accountNumber, bankName} = req.body;

        if(!bitcoin || !accountName || !accountNumber || !bankName){
            req.flash("error_msg", "Enter all fileds");
            return res.redirect("/settings");
        }

        const update = {
            bitcoin,
            accountName,
            accountNumber,
            bankName
        }
        await User.updateOne({_id: req.user.id}, update);
        req.flash("success_msg", "Account updated successfully")
        return res.redirect("/settings");

    }catch(err){

    }
});

module.exports = router;