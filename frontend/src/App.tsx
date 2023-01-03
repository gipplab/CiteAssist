import React, {Component} from 'react';
import './App.css';
import {FileUploader} from "react-drag-drop-files";
import {PDFDocument} from 'pdf-lib'
import {PDFFileForm} from "./PDFFileForm";
import {parsePDF, PDFFile} from "./pdf/PDFParser";
import {createBibTexAnnotation} from "./pdf/PDFBibTexAnnotationGenerator";
import {AppBar, Button, Toolbar, Tooltip, Typography} from "@mui/material";
import {ThemeProvider, createTheme} from '@mui/material/styles';
import ArticleIcon from '@mui/icons-material/Article';
import {TagInputField} from "./TagInputField";
import PowerIcon from '@mui/icons-material/Power';
import PowerOffIcon from '@mui/icons-material/PowerOff';

const PDFJS = window.pdfjsLib;
const fileTypes = ["PDF"];

interface AppProps {
}

interface AppState {
    apiConnected?: boolean;
    file?: PDFFile;
}

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

async function getPDFText(base64File: string) {
    const pdfJSFile = await PDFJS.getDocument(base64File).promise
    const numPages = pdfJSFile.numPages;
    let text = '';
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfJSFile.getPage(i)
        const pageText = await page.getTextContent();
        text += pageText.items.map((item: { str: any; }) => {
            return item.str
        }).join(" ")
    }
    return text
}

class App extends Component<AppProps, AppState> {
    constructor(props: AppProps) {
        super(props);
        this.state = {apiConnected: false};
    }

    callAPI() {
        fetch("http://localhost:9000/testAPI")
            .then(res => res.text())
            .then(_ => this.setState({apiConnected: true})).catch(() => {
            this.setState({apiConnected: false})
        });
    }

    componentWillMount() {
        this.callAPI();
    }

    render() {
        return (
            <ThemeProvider theme={darkTheme}>
                <div className="App">
                    <AppBar position="static">
                        <Toolbar style={{justifyContent: "space-between", alignItems: "center"}}>
                            <div style={{flex: 0.33, display: "flex", alignItems: "center"}}>
                                <ArticleIcon/>
                            </div>
                            <Typography variant="h5" component="div" style={{flex: 0.33}}>
                                {this.state.file ? this.state.file.name : "Enhanced Preprint Generator"}
                            </Typography>
                            <div style={{
                                flex: 0.33,
                                display: "flex",
                                flexDirection: "row-reverse",
                                alignItems: "center"
                            }}>
                                {this.state.apiConnected ? (
                                    <Tooltip title="API connected!"><PowerIcon/></Tooltip>) : (
                                    <Tooltip title="API disconnected!"><PowerOffIcon/></Tooltip>)}
                                <Button color="inherit" onClick={() => {
                                    this.setState({file: undefined})
                                }}>Reset Document</Button>
                            </div>
                        </Toolbar>
                    </AppBar>
                    <header className="App-header">
                        {(!this.state.file) &&
                            <>
                                <h6>Drag & Drop a preprint PDF to enhance it! </h6>
                                <FileUploader handleChange={async (file: any) => {
                                    let base64File = await toBase64(file)
                                    let pdfDoc = await PDFDocument.load(base64File)

                                    //TODO make useful
                                    const pdfText = await getPDFText(base64File);
                                    console.log(pdfText)

                                    let pdfFile: PDFFile = {
                                        name: file.name,
                                        file: pdfDoc,
                                        info: parsePDF(pdfDoc, file.name)
                                    }
                                    this.setState({
                                        file: pdfFile
                                    })

                                }} name="file"
                                              types={fileTypes}/>
                            </>}
                        {this.state.file &&
                            <div style={{maxWidth: "80%"}}>
                                <h6>BibTex Information</h6>
                                <PDFFileForm onSubmit={async (bibTexEntries) => {
                                    await createBibTexAnnotation(
                                        this.state.file!.file,
                                        this.state.file!.name,
                                        bibTexEntries
                                    )
                                }} info={this.state.file.info}/>
                                <br/>
                                <h6>Keywords</h6>
                                <div style={{position: "relative", bottom: 0, left: 0}}>
                                    <TagInputField/>
                                </div>
                            </div>

                        }
                    </header>
                </div>
            </ThemeProvider>
        );
    }
}


export default App;
