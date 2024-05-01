class Token
{
    constructor(type, value)
    {
        this.type = type;
        this.value = value;
    }
}

class Lexer
{   #input;
    #index;
    inputCodeline;
    constructor(input)
    {
        this.#input = input;
        this.#index = 0;
        this.inputCodeline = 1;

    }

    #isEndOfInput() {
        return this.#index >= this.#input.length;
    }

    #createToken(type,value){
        return new Token(type, value);
    }

    nextToken(colorizingText = false) {

        const token = this.#skipWhitespaceAndCommentsExceptWhenColorizingInputTokens(colorizingText);
        if (token)
            return token;

        const currentChar = this.#input [this.#index];

        if (this.#isEndOfInput()) {
            return new Token('END-FILE', null);
        } else if (this.#isLetterOrDigit(currentChar)) {
            return this.#handleLetterOrDigit(currentChar, colorizingText);
        } else if (this.#isOperator(currentChar)) {
            return this.#handleOperator(currentChar);
        } else {
            return this.#handleUnknownToken(currentChar, colorizingText);
        }
    }

    #skipWhitespaceAndCommentsExceptWhenColorizingInputTokens(colorizingText) {

        const whitespace = /\s/;
        const newLine = '\n';

        let currentChar = this.#input[this.#index];

        while (whitespace.test(currentChar)) {
            if (currentChar === newLine) {
                this.inputCodeline++;
            }

            this.#index++;

            if (this.#isEndOfInput()) {
                return new Token('END-FILE', null);
            }

            currentChar = this.#input [this.#index];
        }

        if (currentChar === '/' && this.#input [this.#index + 1] === '/')
        {
            const commentValue = this.#handleComment();

            if (colorizingText) {
                return this.#createToken('COMMENT', commentValue);
            } else {
                this.#index++;
                return this.nextToken();
            }
        }
    }

    #isLetterOrDigit(char) {
        return /[a-zA-Z0-9_]/.test(char);
    }


    #handleLetterOrDigit(currentChar, colorizingText) {

        let value = '';
        let startsWithDigit = /\d/.test(currentChar);
        let lexerErroredDueToIdStartingWithNum = false;

        while (this.#isLetterOrDigit(currentChar))
        {
            value += currentChar;
            this.#index++;

            if (this.#isEndOfInput()){
                break;
            }

            currentChar = this.#input [this.#index];

            if (startsWithDigit && /[a-zA-Z_]/.test(currentChar)) {
                lexerErroredDueToIdStartingWithNum = true;
            }
        }

        if (lexerErroredDueToIdStartingWithNum) {
            return this.#handleLexerErrorIDStartsWithNum(colorizingText, value);
        } else {
            return /^[0-9]+$/.test(value)
                ? this.#createToken('NUM', value)
                : this.#handleKeywordsAndIdentifiers(value);
        }
    }

    #handleLexerErrorIDStartsWithNum(colorizingText, value) {

        if (colorizingText) {
            return this.#createToken('ERROR', value);
        } else {
            this.#handleIdentifierStartsWithNumberError(value);
        }
    }

    #handleIdentifierStartsWithNumberError(value) {
        this.#lexerError(this.inputCodeline, 'Identifiers cannot start with a number but found', value);
    }

    #isOperator(char) {
        return /[+\-*\/%():><;=!]/.test(char);
    }

    #handleOperator(currentChar) {

        let thisOperator = currentChar;
        this.#index++;

        // Check for multi-character operators
        if (currentChar === '!' && this.#input [this.#index] === '=') {
            thisOperator += this.#input [this.#index];
            this.#index++;
        } else if (currentChar === '=' && this.#input [this.#index] === '=') {
            thisOperator += this.#input [this.index];
            this.#index++;
        } else if (currentChar === '=' && this.#input [this.#index] === '<') {
            thisOperator += this.#input [this.index];
            this.#index++;
        } else if (currentChar === '>' && this.#input [this.#index] === '=') {
            thisOperator += this.#input [this.#index];
            this.#index++;
        }

        return this.#createToken(this.#getOperatorToken(thisOperator), thisOperator);
    }

    #handleUnknownToken(currentChar, colorizingText) {

        this.#index++;

        if (colorizingText) {
            return new Token("ERROR", currentChar);
        } else {
            this.#lexerError(this.inputCodeline, 'Unknown Token', currentChar);
        }
    }

    #handleComment() {

        let value = '//';

        this.#index += 2; // skip the initial "//"
        while (this.#input [this.#index] !== '\n' && this.#index < this.#input.length) {
            value += this.#input [this.#index++];
        }
        return value;
    }

    #handleKeywordsAndIdentifiers(value) {
        const keywords = {
            "program": 'START',
            "end_program": 'END',
            "loop": 'LOOP',
            "end_loop": 'END-LOOP',
            "if": 'IF',
            "end_if": 'END-IF',
            "else": 'ELSE'
        };

        return keywords[value] ? this.#createToken(keywords[value], value) : this.#createToken('ID', value);
    }

    #getOperatorToken(operatorChar) {
        const operatorMap = {
            "+": 'ADD',
            "-": 'SUB',
            "*": 'MULT',
            "/": 'DIV',
            "%": 'REMAIN',
            ";": 'SEMI',
            "=": 'ASSIGN',
            "<": 'LESS',
            ">": 'GREATER',
            "(": 'LEFT_PAR',
            ")": 'RIGHT_PAR',
            ":": 'COLON',
            "!": 'NOT',
            "!=": 'NOT-EQUAL',
            "==": 'EQUAL',
            ">=": 'GREATER-EQUAL',
            "=<": 'LESS-EQUAL'
        };

        return operatorMap[operatorChar] || 'OTHER_OP';
    }


    colorInputTokenizer(hasError = false, parserIndex) {

        const tokens = [];
        const callingNextTokenForColorizingInputTrue = true;

        while (!this.#isEndOfInput()) {

            const token = this.nextToken(callingNextTokenForColorizingInputTrue);

            if (token.type !== 'END-FILE') {
                tokens.push(token);
            }
        }

        if (hasError === true)
        {
            const errorTokenValue = tokens[parserIndex].value;
            tokens[parserIndex] = new Token ('ERROR', errorTokenValue);
        }

        return tokens;
    }

    #lexerError(inputLine, errorMessage, tokenValue) {
        colorizeInputText();
        throw new SyntaxError( `Lexer Error (Line: ${inputLine}) ${errorMessage}: ${tokenValue}`);
    }
}

class Parser
{
    #lexer;
    #nextToken;
    #advanceTokenOnMatch;
    #doNotAdvanceTokenOnMatch;
    #sendMatchError;
    #doNotSendMatchError;

    constructor(lexer) {
        this.#lexer = lexer;
        this.#nextToken = this.#lexer.nextToken();
        this.#advanceTokenOnMatch = true;
        this.#doNotAdvanceTokenOnMatch = false;
        this.#sendMatchError = true;
        this.#doNotSendMatchError = false;
    }

    #advanceToken() {


        this.#nextToken = this.#lexer.nextToken();
        if ( !['END', 'END-FILE'].includes(this.#nextToken.type)) {
            this.#outputNextTokenToConsole();
        }
    }

    #checkToken(expectedTypes) {

        return Array.isArray(expectedTypes)
            ? expectedTypes.includes(this.#nextToken.type)
            : this.#nextToken.type === expectedTypes;
    }

    #outputNextTokenToConsole() {
        consoleOutput.append(colorizeConsoleText('Next Token is ' + this.#nextToken.type + '\n', 'coral'));
    }


    #match(expectedTypes, sendErrorToConsole = true, advanceToken = true) {

        if (this.#checkToken(expectedTypes))
        {
            if (advanceToken === true){
                this.#advanceToken();
            }

            return true;
        }
        else
        {
            if (sendErrorToConsole === true) {
                const expected = Array.isArray(expectedTypes) ? expectedTypes.join(", ") : expectedTypes;
                this.#parseError(`Expected token type ${expected} but found ${this.#nextToken.type}`);
            }

            return false;
        }
    }

    #parseError(message) {

        colorizeInputText(this.#lexer.inputCodeline);
        throw new SyntaxError(`Parser Error: (Line: ${this.#lexer.inputCodeline}) ${message}`);
    }

    parseProgram() {

        this.#outputNextTokenToConsole();
        this.#match('START', this.#sendMatchError,  this.#doNotAdvanceTokenOnMatch);

        consoleOutput.append('Enter < program >\n');
        while (!this.#match('END', this.#doNotSendMatchError,  this.#doNotAdvanceTokenOnMatch)) {

            if (this.#match('END-FILE', this.#doNotSendMatchError,  this.#doNotAdvanceTokenOnMatch)) {
                this.#parseError('End of program reached unexpectedly.');
            }

            this.#advanceToken();
            this.#parseStatements();
        }

        this.#outputNextTokenToConsole();
        this.#match('END');
        this.#match('END-FILE', this.#sendMatchError, this.#doNotAdvanceTokenOnMatch);

        consoleOutput.append('Exit < program >\n');
    }

    #parseStatements() {

        consoleOutput.append('Enter < statements >\n');

        while (!this.#match(['END-LOOP', 'END-IF', 'END', 'END-FILE'], this.#doNotSendMatchError, this.#doNotAdvanceTokenOnMatch))
        {
            this.#parseStatement();
            consoleOutput.append('Exit < statements >\n');
        }
    }

    #parseStatement() {

        consoleOutput.append('Enter < statement >\n');

        switch (this.#nextToken.type)
        {
            case "ID":
                this.#parseAssign();
                break;
            case "LOOP":
                this.#parseLoop();
                break;
            case "IF":
                this.#parseIf();
                break;
            default:
                this.#parseError('Expected types ID, LOOP, or IF but received ' + this.#nextToken.type);
        }

        consoleOutput.append('Exit < statement >\n');
    }

    #parseAssign() {

        consoleOutput.append('Enter < assign >\n');

        this.#match('ID');
        this.#match('ASSIGN');
        this.#parseExpression();
        this.#match('SEMI');

        consoleOutput.append('Exit < assign >\n');
    }

    #parseLoop() {

        consoleOutput.append('Enter < loop >\n');
        this.#advanceToken();

        this.#match('LEFT_PAR');
        this.#match('ID' );
        this.#match('ASSIGN' );
        this.#parseVar();

        this.#match('COLON');
        this.#parseVar();

        this.#match('RIGHT_PAR');
        this.#parseStatements();

        this.#match('END-LOOP');
        consoleOutput.append('Exit < loop >\n');

    }

    #parseIf() {

        consoleOutput.append('Enter < if >\n');
        this.#advanceToken();

        this.#match('LEFT_PAR');
        this.#parseLogic();

        this.#match('RIGHT_PAR');
        this.#parseStatements();

        this.#match('END-IF');
        consoleOutput.append('Exit < if >\n');
    }


    #parseLogic() {

        consoleOutput.append('Enter < logic >\n');

        this.#match('ID');
        this.#match(['NOT-EQUAL', 'EQUAL', 'GREATER-EQUAL', 'LESS-EQUAL', 'LESS', 'GREATER']);
        this.#parseVar();

        consoleOutput.append('Exit < logic >\n');
    }

    #parseExpression() {

        consoleOutput.append('Enter < expression >\n');
        this.parseTerm();

        while (this.#match(['ADD', 'SUB', 'MULT', 'DIV', 'REMAIN'], this.#doNotSendMatchError, this.#advanceTokenOnMatch)){
               this.parseTerm();
        }

        consoleOutput.append('Exit < expression >\n');
    }

    parseTerm() {

        consoleOutput.append('Enter < term >\n');
        if (this.#match('LEFT_PAR', this.#doNotSendMatchError, this.#advanceTokenOnMatch)) {
            this.#parseExpression();
            this.#match('RIGHT_PAR');
        }
        else { this.#parseVar(); }
        consoleOutput.append('Exit < term >\n');
    }

    #parseVar() {

        consoleOutput.append('Enter < var >\n');
        this.#match(['ID', 'NUM']);
        consoleOutput.append('Exit < var >\n');
    }
}

const consoleOutput = document.getElementById('consoleOutput');
const inputExpression = document.getElementById('input-expression');
const lineNumbers = document.getElementById('lineNumbers');
let inputCopy;

    function setEventListeners() {
        document.getElementById('run-button').addEventListener('click', handleRunButtonClick);
        inputExpression.addEventListener('input', updateLineNumbers);
        document.getElementById('documentation-button').addEventListener('click', handleDocumentationClick);
        document.getElementById('clear-button').addEventListener('click', handleClearButtonClick);
        document.getElementById('export-button').addEventListener('click', handleExportButtonClick);
    }

    function handleRunButtonClick() {
        consoleOutput.style.color = "";
        consoleOutput.style.backgroundColor = "";
        consoleOutput.textContent = '';

        const inputInnerHtml = inputExpression.innerHTML;
        inputCopy = inputInnerHtml;
        const inputTextWithoutHTML = getTextFromHtml(inputInnerHtml);

        const lexer = new Lexer(inputTextWithoutHTML);
        const parser = new Parser(lexer);

        try {
            parser.parseProgram();
            colorizeInputText();

            inputExpression.addEventListener('click', handleInputClickAfterRun);

        } catch (error) {
            consoleOutput.style.color = "#A5585D";
            inputExpression.addEventListener('click', handleInputClickAfterRun);
            consoleOutput.append('ERROR: Processing stopped due to ' + error.message);
        }
    }

    function handleDocumentationClick() {
        window.open('CSC_4101_Project.pdf', '_blank');
    }

    function handleClearButtonClick() {

        inputExpression.removeEventListener('click', handleInputClickAfterRun);

        inputExpression.textContent = '';
        consoleOutput.textContent = '';

        updateLineNumbers();
    }

    function handleExportButtonClick() {

        const blob = new Blob(['*************Input Code*************\n' +
        getTextFromHtml(inputExpression.innerHTML) + '\n*************Parsed Code*************\n'
        + consoleOutput.textContent], {type: 'text/plain'});

        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');

        downloadLink.href = url;
        downloadLink.download = 'output.txt';
        downloadLink.click();

        URL.revokeObjectURL(url);
    }

    function handleInputClickAfterRun() {
        inputExpression.innerHTML = inputCopy;
        inputExpression.removeEventListener('click', handleInputClickAfterRun);
    }

function callPlaceHolderFunctions(){
     let placeholderText = '//Enter your code here then click run.\n//View the EBNF Grammar by \n//hovering over the information (i) icon';

     function setPlaceHolderEventListeners(){
         inputExpression.addEventListener('focus', removePlaceholder);
         inputExpression.addEventListener('blur', addPlaceholder);
         inputExpression.addEventListener('input', handleInputPlaceholder);
     }

    function removePlaceholder() {

        if (inputExpression.textContent === placeholderText) {
            inputExpression.classList.remove('placeholder');
            inputExpression.textContent = '';
        }
    }

    function addPlaceholder() {

        if (inputExpression.textContent === '') {
            inputExpression.classList.add('placeholder');
            inputExpression.textContent = placeholderText;
        }
    }

    function handleInputPlaceholder() {

        if (inputExpression.textContent === '') {
            inputExpression.classList.add('placeholder');
        } else {
            inputExpression.classList.remove('placeholder');
        }
    }

    addPlaceholder();
    setPlaceHolderEventListeners()
}

    function updateLineNumbers() {

        let content = inputExpression.innerHTML.replace(/<br\s*\/?>/gi, '\n');

        if (content.endsWith('\n')) {
            content = content.slice(0, -1);
        }

        const lines = content.split(/\n/);
        let lineNumbersContent = '';

        for (let i = 1; i <= lines.length; i++) {
            lineNumbersContent += i + '\n';
        }

        lineNumbers.textContent = lineNumbersContent;
    }

    function getTextFromHtml(html) {

        const container = document.createElement('div');

        container.innerHTML = html;
        container.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

        return container.textContent;
    }

    function colorizeInputText(erroredOnLine = null) {

        const inputLines = inputExpression.innerText.split('\n');
        let newColorizedInputHtml = '';
        let processingLine = 0;

        inputLines.forEach(line =>
        {
            processingLine++;

            const tokens = new Lexer(line).colorInputTokenizer();
            const coloredLine = tokens.map(token =>
            {
                const colorClass = getColorByTokenType(token);
                return `<span class="${colorClass}">${token.value}</span>`;

            }).join(' ');

            if (erroredOnLine !== null && processingLine === erroredOnLine) {
                newColorizedInputHtml += `<mark>${coloredLine}</mark><br>`;
            } else {
                newColorizedInputHtml += `${coloredLine}<br>`;
            }
        });

        inputExpression.innerHTML = newColorizedInputHtml;
        updateLineNumbers();
    }

    function colorizeConsoleText(text, color) {

        const span = document.createElement('span');
        span.textContent = text;
        span.classList.add(`${color}-text`);

        return span;
    }

    function getColorByTokenType(token) {

        const tokenTypeColorMap = {
            'NUM': 'color-purple',
            'ID': 'color-white',
            'START': 'color-blue',
            'END': 'color-blue',
            'LOOP': 'color-green',
            'END-LOOP': 'color-green',
            'IF': 'color-green',
            'END-IF': 'color-green',
            'ERROR': 'color-red',
            'COMMENT': 'color-grey'
        };

        return tokenTypeColorMap[token.type];
    }

    function mainFunctionsToCall(){
        callPlaceHolderFunctions();
        setEventListeners();
    }

    mainFunctionsToCall();
