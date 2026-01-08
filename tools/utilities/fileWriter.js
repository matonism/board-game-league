import fs from "fs";

export function createFile(folderPath, fileName, extension, content){

    let fileLocation = createFolderIfNeeded(folderPath + fileName + '.' + extension);
    writeFile(fileLocation, content);

}

export function createFolderIfNeeded(path){
    // let fileLocation = 'data-files' + path + (fileType ? fileType : '.json');

    let folderList = path.split('/');
    let folderLocation = '';
    console.log(folderLocation);
    for(let i = 0; i < folderList.length-1; i++){
        if(i>0){
            folderLocation+='/';
        }
        folderLocation += folderList[i];
        console.log('checking folder: ' + folderLocation);
        console.log(fs.existsSync(folderLocation));
        if (!fs.existsSync(folderLocation)) {
            fs.mkdirSync(folderLocation)
            console.log('making folder: ' + folderLocation);

        }
    }
    console.log(folderLocation + '/' + folderList[folderList.length-1]);
    return folderLocation + '/' + folderList[folderList.length-1];
}

export function writeFile(path, content) {

    var writeStream = fs.createWriteStream(path);
    writeStream.write(content);
    writeStream.end();
}
