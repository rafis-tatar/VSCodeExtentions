import * as vscode from 'vscode';
import * as fs from 'fs';
import * as zipper from 'zip-local';
import * as fs_extra from 'fs-extra'
import * as del from 'del';
import * as path from 'path';
import * as Q from 'q';
import { Guid } from './utils';

export class FileOperations{
  
  public terminal :vscode.Terminal;
  
  private fileName:path.ParsedPath;
  private dist:string;
  private ident:string;
  public version: string = "1.0.0";
  public standart:string="netcoreapp2.0"

  public init(reference:string){  
    this.fileName = path.parse(reference);    
    this.ident = Guid.newGuid('5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');        
    this.dist = this.createFolderLib(this.fileName.name);
  }  
  
  private createFolderLib(modulName){
    let referencesPath=vscode.workspace.rootPath + '/References';       
    if (!fs.existsSync(referencesPath)) 
    {                  
      fs.mkdirSync(referencesPath);    
      fs.mkdirSync(referencesPath+'/packages');
    }

    let dist = referencesPath+'/'+ modulName+'.'+this.version;
    if (!fs.existsSync(dist))
    {
        fs.mkdirSync(dist);
    }

    let rels= dist +"/_rels";
    if (!fs.existsSync(rels)) fs.mkdirSync(rels);    

    let lib = dist +"/lib";
    if (!fs.existsSync(lib))
    {
      fs.mkdirSync(dist +"/lib");
      fs.mkdirSync(dist +"/lib/"+this.standart);
    }

    let pkge =dist +"/package";
    if (!fs.existsSync(pkge))
    {
      fs.mkdirSync(dist +"/package");
      fs.mkdirSync(dist +"/package/services");
      fs.mkdirSync(dist +"/package/services/metadata");
      fs.mkdirSync(dist +"/package/services/metadata/core-properties");
    }
    return dist;
  }

  //Copy source dll and zipping as  .nupkg  
  public copyFileAndZipping():Q.Promise<string>{
    const deff:Q.Deferred<string>=Q.defer<string>();
    if (!fs.existsSync(this.dist +'/'+ this.fileName.base)){    
      let referencesPath=vscode.workspace.rootPath + '/References';
      let packageName = this.fileName.name+'.'+this.version+'.nupkg';
      let sourcePathMasked = referencesPath+'/'+this.fileName.name+'.'+ this.version;   
      let delPath =vscode.workspace.rootPath + '/References/'+this.fileName.name+'.'+ this.version;
      let modulName = this.fileName.name;

       //copy dll
      fs_extra.copySync(this.fileName.dir+'/'+ this.fileName.base,this.dist +"/lib/"+this.standart +'/'+ this.fileName.base);

       //if exist xml documentation
      if (fs.existsSync(this.fileName.dir + '/' + this.fileName.name + '.xml'))
      {
        //copy xml
        fs_extra.copySync(this.fileName.dir + '/' + this.fileName.name + '.xml',this.dist +"/lib/"+this.standart +'/'+ this.fileName.name + '.xml');
      }

      zipper.sync.zip(sourcePathMasked).compress().save(referencesPath+'/'+packageName);
      del(sourcePathMasked,{force:true});

      del(delPath,{force:true});
      deff.resolve(modulName);
    }   
    return deff.promise;
  } 
  
  public addPackage(pkgName:string)
  {
    let cacheFile =vscode.workspace.rootPath + '/obj/project.assets.json';
    if (fs.existsSync(cacheFile))
    {
       fs_extra.removeSync(cacheFile);
    }    
    this.terminal.sendText('dotnet add package '+pkgName+' --package-directory "./References/packages"' );      
  }

  public createNUSPECFile(){    
    let content:string = '<?xml version="1.0"?>\n'+
    '<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">\n'+
      '<metadata>\n'+
        '<id>'+this.fileName.name+'</id>\n'+
        '<version>'+this.version+'</version>\n'+
        '<authors>Add Local Reference Extention</authors>\n'+
        '<description>Local Reference.</description>\n'+
      '</metadata>\n'+
    '</package>';
    fs.writeFileSync(this.dist+'/'+this.fileName.name+'.nuspec', content);        
  }
  
  public createContentType(){
    let content=
    '<?xml version="1.0" encoding="utf-8"?>\n'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />\n'+
      '<Default Extension="psmdcp" ContentType="application/vnd.openxmlformats-package.core-properties+xml" />\n'+
      '<Default Extension="dll" ContentType="application/octet" />\n'+
      '<Default Extension="nuspec" ContentType="application/octet" />\n'+
    '</Types>';
    fs.writeFileSync(this.dist+'/'+'[Content_Types].xml', content);
  }
  
  public createRels(){
    let content = 
    '<?xml version="1.0" encoding="utf-8"?>\n'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'+
      '<Relationship Type="http://schemas.microsoft.com/packaging/2010/07/manifest" Target="/'+this.fileName.name+'.nuspec" Id="'+Guid.newGuid('Rxxxxxxxxxxxxxxxx')+'" />\n'+
      '<Relationship Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="/package/services/metadata/core-properties/'+this.ident+'.psmdcp" Id="'+Guid.newGuid('Rxxxxxxxxxxxxxxxx')+'" />\n'+
    '</Relationships>';
    fs.writeFileSync(this.dist+'/_rels/.rels', content);    
  }

  public createPSMDCP(){
    let content = '<?xml version="1.0" encoding="utf-8"?>\n'+
    '<coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">\n'+
      '<dc:creator>AddLocalNetReferences</dc:creator>\n'+
      '<dc:description>Package Description</dc:description>\n'+
      '<dc:identifier>'+this.fileName.name+'</dc:identifier>\n'+
      '<version>'+this.version+'</version>\n'+
      '<keywords></keywords>\n'+
      //'<lastModifiedBy>NuGet, Version=4.1.0.2450, Culture=neutral, PublicKeyToken=31bf3856ad364e35;Microsoft Windows NT 6.2.9200.0;.NET Framework 4.5</lastModifiedBy>\n'+
    '</coreProperties>';
    fs.writeFileSync(this.dist +"/package/services/metadata/core-properties"+'/'+this.ident+'.psmdcp', content);
  }   


  public creatNugetConfig()
  {
    let confFile = vscode.workspace.rootPath+'/nuget.config';
    if (!fs.existsSync(confFile))
    {
      let confContent = 
      '<?xml version="1.0" encoding="utf-8"?>\n'+
        '<configuration>\n'+  
        '<packageSources>\n'+
        ' <clear/>\n'+
        '<add key="Local" value="./References"/>\n'+      
        '</packageSources>\n'+
        '</configuration>';
        fs.writeFileSync(confFile, confContent);
    }     
  }
}