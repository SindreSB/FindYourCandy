/* 
Logic that can be used to allow navigation in init.js

When clickOrWait is called, the set forwardKey and backKey may be used to navigate using the given forward/backwards-function, respectively.
After a given maximum duration (in milliseconds), the function will "navigate forwards" "automatically", but this can be cancelled by spressing the waitKey.
Further presses of the waitkey will resume the countdown towards the given max wait time, without refreshing it.

Back-, forwards-, and cancel- functions need to be declared as expressions (var x = function (){...})
*/

var checkFreq=200; //How often should we check whether enough time has passed considering the maximum duration.
var waitKey=32; //What key should prevent automatic forwards navigation. here 32: Space
var backKey=37;//What key navigates "backwards": <-
var forwardKey=39;//What key navigates "forwards": ->
var cancelRunncingFunc;
var checkerTimeout;
var funcForward;
var funcBack;
var keepChecking=false;
var waitDebounceStamp;
var durMaxStamp;

//Call this in the beginning of a function where navigation should be possible
function clickToNav(cancelThisFunc, functionBack, functionForward){
    funcForward=functionForward;
    funcBack=functionBack;
    cancelRunncingFunc=cancelThisFunc;
}

//Call this to enable "forwards navigation" after a given time
function waitToNav(durMax){
    durMaxStamp=Date.now()+durMax;
    keepChecking=true;
    checkMaxDurPassed(durMaxStamp);
}

function clickOrWait(durMax,cancelThisFunc, functionBack, functionForward){
    clickToNav(cancelThisFunc, functionBack, functionForward);
    waitToNav(durMax);
}

document.onkeyup = function(e){
    if(e.keyCode==waitKey){
        if(keepChecking){
            keepChecking=false;//automatic forwards navigation is prevented by 1 press of the wait key. 
        } else{
            forward();
        }
    } else if(e.keyCode==forwardKey){
        forward();
    } else if(e.keyCode==backKey){
        backward();
    }
};

 function checkMaxDurPassed(maxStamp){
    if(keepChecking){
        if(Date.now()-maxStamp>=0){
            forward();
        } else {
            checkerTimeout = setTimeout(checkMaxDurPassed, checkFreq, maxStamp);
        }
    }
}

var cleanUp = function(){
    keepChecking=false;
    clearTimeout(checkerTimeout);
    cancelRunncingFunc();
}

var forward = function(){
    cleanUp();
    funcForward();
}

var backward = function(){
    cleanUp();
    funcBack();
}

//For "testing"
var one = function(){
    clickToNav(cancelAFunc, five,two);
    console.log("one");
    waitToNav(500);
}
var two = function(){
    clickToNav(cancelAFunc, one,three);
    console.log("two");
    waitToNav(500);
}
var three = function(){
    clickToNav(cancelAFunc, two,four);
    console.log("three");
    waitToNav(500);
}
var four = function(){
    clickToNav(cancelAFunc,  three,five);
    console.log("four");
    waitToNav(500);
}
var five = function(){
    clickToNav(cancelAFunc, four,one);
    console.log("five");
    waitToNav(500);
}

var cancelAFunc= function(){
//Specify to stop the current running function
}

console.log("main");
one();