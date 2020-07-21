$('#loginAlert').hide();
const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get('error');
if(myParam == "Incorrect_Credential") {
$('#loginAlert').show();
}

$(".tiptext").mouseover(function() {
    $(this).children(".description").show();
}).mouseout(function() {
    $(this).children(".description").hide();
});