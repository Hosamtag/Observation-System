$(".tiptext").mouseover(function() {
    $(this).children(".description").show();
}).mouseout(function() {
    $(this).children(".description").hide();
});

$('#file').change(function() {
    var i = $(this).prev('label').clone();
    var file = $('#file')[0].files[0].name;
    $(this).prev('label').text(file);
  });

function buttontext() {
  var x = document.getElementById("button");
  if (x.innerHTML === "Show all Assets") {
    x.innerHTML = "Hide all Assets";
    document.getElementById("urls").style.display = "block";
  } else {
    x.innerHTML = "Show all Assets";
    document.getElementById("urls").style.display = "none";
  }
}

function openform() {
    document.getElementById("formAddCluster").style.width = "100%";
  }
function closeform() {
    document.getElementById("formAddCluster").style.width = "0%";   
}

function openedit(id) {
  if(document.getElementById(id).style.display === "none"){
    document.getElementById(id).style.display = "block";
  }
  else{
    document.getElementById(id).style.display = "none";
  }
}
