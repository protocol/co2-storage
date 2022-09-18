export class Test {
    message = ""
    constructor(message) {
        this.message = message
    }

    printMessage(message) {
        if(message == undefined)
            message = this.message
        console.log(message)
    }
}