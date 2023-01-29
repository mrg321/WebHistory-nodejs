/**
* The following program contains source code for some functions with the purpose of
* getting the web history of Router Asus RT-AC68U. This history can be got from the
* admin web application of the router, but it is not possible to store it. This program
* gets the history and stores it as csv files in a folder, keeping the full history
* in an appropriate manner.
*/

const fs = require('fs');

/**
* Function that parses a cookie
* @author   Rehmaanali https://www.geekstrick.com/snippets/how-to-parse-cookies-in-javascript/
* @param    {String} name    Name of the cookie
*/
const parseCookie = str =>
  str
  .split(';')
  .map(v => v.split('='))
  .reduce((acc, v) => {
    if (v.length > 1)
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
    else
      acc[decodeURIComponent(v[0].trim())];
    return acc;
  }, {});

let axios = require('axios');

let qs = require('qs');

/**
* Function that logs into Asus Admin Router APP backend and gets the token
* @author   mrg321 https://www.mrmiguelrodriguez.com
* @param    {String} baseUrl Router URL
* @param    {String} user
* @param    {String} password  
*/
const loginAsus = async (baseUrl, user, pass) => {
  const b64Auth = Buffer.from(user + ":" + pass).toString('base64');
  let data = qs.stringify({
    'group_id': '',
    'action_mode': '',
    'action_script': '',
    'action_wait': '5',
    'current_page': 'Main_Login.asp',
    'next_page': 'index.asp',
    'login_authorization': b64Auth,
    'login_captcha': ''
  });
  let config = {
    method: 'post',
    url: baseUrl + 'login.cgi',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': '',
      'Origin': baseUrl,
      'Referer': baseUrl + 'Main_Login.asp',
      'Upgrade-Insecure-Requests': '1',
      //Not needed param, but can be used
      //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 
      //AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      'sec-gpc': '1'
    },
    data: data
  };
  try {
    const response = await axios(config);
    let token = parseCookie(response.headers['set-cookie'][0]).asus_token;
    return token;
  } catch (error) {
    console.error(error);
    return "";
  }
};

/**
* Function that gets the javascript code with all the web accesses.
* It gets the source code of an array with all the URLs (hosts).
* @author   mrg321 https://www.mrmiguelrodriguez.com
* @param    {String} baseUrl Router URL
* @param    {String} token Token coming fron the login function
* @param    {Number} page Number of pages to get 
*/
const getWebHistoryCode = async (baseUrl, token, page) => {
  let asusToken = 'asus_token=' + token;
  let config = {
    method: 'get',
    url: baseUrl + 'getWebHistory.asp?client=all&page=' + page.toString() + '&_=1670237587904',
    headers: {
      'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      'Cookie': asusToken,
      'Referer': 'http://router.asus.com/AdaptiveQoS_WebHistory.asp',
      //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 
      //AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'sec-gpc': '1'
    }
  };
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(error);
    return "";
  }
};

/**
* Function that gets the list of clients that connect to the Asus Router.
* It gets an array with Mac Address, Name and Nickname.
* PENDING: Include IP
* @author   mrg321 https://www.mrmiguelrodriguez.com
* @param    {String} baseUrl Router URL
* @param    {String} token Token coming fron the login function
*/
const getClientList = async (baseUrl, token) => {
  let asusToken = 'asus_token=' + token;
  let config = {
    method: 'get',
    url: baseUrl + 'appGet.cgi?hook=get_clientlist()',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      'Cookie': asusToken,
      'Referer': baseUrl + 'index.asp',
      //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 
      //AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36', 
      'X-Requested-With': 'XMLHttpRequest',
      'sec-gpc': '1'
    }
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
* Function that gets a hashcode.
* @author   unknown || got from: https://stackoverflow.com/questions/7616461/
* generate-a-hash-from-string-in-javascript
* @param    {String} str string to calculate hashcode from
*/
function hashCode(str) {
  return str.split('').reduce((prevHash, currVal) =>
    (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0) + Math.pow(2, 31);
}

/**
* Function that gets the list of accesses from the Asus Router from 
* the input Date (fromDate) until last access got from the Router.
* It also writes the accesses in the outputFile of the parameter.
* @author   mrg321 https://www.mrmiguelrodriguez.com
* @param    {String} baseUrl Router URL
* @param    {String} usu User for login
* @param    {String} pass Password for login
* @param    {Number} pages Max number of pages to get
* @param    {String} fromDate Starting date to get accesses
* @param    {String} sep Separator for the csv file that is writen
* @param    {String} outputFile File to write output
*/
const getWebHistoryData = async (baseUrl, usu, pass, pages, fromDate, sep, outputFile) => {
  //First login:
  let token = await loginAsus(baseUrl, usu, pass);
  if (token.length === 0) {
    console.log("Empty token");
    return "Empty token";
  }
  //Second get the client list:
  let objClientList = await getClientList(baseUrl, token);
  let code = "";
  let index = 1;
  let dateTime = new Date();
  //Then loop until you get the max number of pages or the fromDate is reached:
  while (index <= pages && fromDate <= dateTime) {
    //get the array with the results
    code = await getWebHistoryCode(baseUrl, token, index);
    if (code === "") {
      console.log("no code");
      return "no code"
    };
    eval(code);
    // Use map function to traverse on each row of the 2D array
    let csv = array_temp
      .map((item) => {
        // Here item refers to a row in that 2D array
        let row = item;
        //first column is mac address
        //console.log(row);
        let mac = row[0];
        //console.log(mac);
        let hash = hashCode(row.join(''));
        if (objClientList != null && mac != "") {
          //get name from mac
          let name = "";
          try{
            name = objClientList.get_clientlist[mac].name;
          }catch(error){
            //Name not found
          }
          //get nickName
          let nickName = "";
          try{
            nickName = objClientList.get_clientlist[mac].nickName;
          }catch(error){
            //nickName not found
          }
          let macType = nickName.match('^([0-9a-fA-F]{2}[:.-]){5}[0-9a-fA-F]{2}$');
          nickName = macType === null ? nickName : "";
          //if nickName is "", then return name
          name = nickName === "" ? name : nickName;
          let ip = objClientList.get_clientlist[mac].ip;
          //Include hash as first column and also ip
          row[0] = hash + sep + row[0] + sep + name + sep + ip;
        }
        //second column is date-time
        dateTime = new Date(Number(row[1]) * 1000); 
        row[1] = row[1] + sep + dateTime.toLocaleDateString() + " " + dateTime.toLocaleTimeString();
        if (fromDate <= dateTime) return row.join(sep);
      }) // At this point we have an array of strings
      .join("\n");
    //the function also writes the content in the standard output, but this can be removed
    console.log(csv);
    if (outputFile != "") {
      fs.writeFile(outputFile, csv + "\n", {
        flag: 'a+'
      }, err => {})
    }
    index++;
  }
}

/**
* Function that gets the folder to put the file with the results 
* Depending on the environment: Win32: \documents\asusdata
* Other (pending to be tested): $HOME/asusdata
* @author   mrg321 https://www.mrmiguelrodriguez.com
*/
const getUserFolder = string => { //Pendiente: Si no existe la carpeta, crearla
  return ((process.platform == 'win32') ? process.env[('USERPROFILE')] + 
  "\\documents\\asusdata\\" : process.env[('HOME')] + "/asusdata/");
}

/**
* Function that converts a date in yyyyMMddHHmmss format 
* @author unknown || got from https://stackoverflow.com/questions/19448436/
* how-to-create-date-in-yyyymmddhhmmss-format-using-javascript
*/
Date.prototype.yyyyMMddHHmmss = function () {
  var date = this;
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hh = date.getHours();
  var mm = date.getMinutes();
  var ss = date.getSeconds();
  return "" + year +
      (month < 10 ? "0" + month : month) +
      (day < 10 ? "0" + day : day) +
      (hh < 10 ? "0" + hh : hh) +
      (mm < 10 ? "0" + mm : mm) +
      (ss < 10 ? "0" + ss : ss);
};

/**
* Function that gets the last time an access has been logged in a file.
* It access the last file logged and gets date of first row.
* If there are not files, it returns date of today minus one day.
* @author   mrg321 https://www.mrmiguelrodriguez.com
* @param    {String} folder Name of the folder to look for files
* @param    {String} separator Separator used in the files
*/
const getLastDateTimeExec = function (folder, separator) {
  let files = fs.readdirSync(folder).reverse();
  for(let i = 0; i < files.length; i++){
    let file = files[i];
    if (file.match("History\-[0-9]+\.csv")){
      const allFileContents = fs.readFileSync(folder + file, 'utf-8');
      let firstLine = allFileContents.split(/\r?\n/)[0];
      //Take 5th column of 1st file as last issued date.
      let dateFr = new Date(Number(firstLine.split(separator)[4]) * 1000);
      //console.log(dateFr.toLocaleDateString() + " " + dateFr.toLocaleTimeString());
      return dateFr; //return date taken from last file
    }
  }
  let dateFr = new Date();
  dateFr.setDate(dateFr.getDate() - 1);
  //console.log(dateFr.toLocaleDateString() + " " + dateFr.toLocaleTimeString());
  return dateFr; //if no matched file, then return yesterday
}

//From this point program uses the functions (MAIN)
let folderName = getUserFolder();
const today = new Date();
let f = folderName + "History" + "-" + today.yyyyMMddHHmmss() + ".csv";  
//console.log(f);
let dateFrom = getLastDateTimeExec(folderName, ";");
//console.log(dateFrom.toLocaleDateString() + " " + dateFrom.toLocaleTimeString());
getWebHistoryData("http://router.asus.com/", "usu", "pass", 500, dateFrom, ";", f);
