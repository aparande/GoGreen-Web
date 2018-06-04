$('#reset-request-form').bootstrapValidator({
//        live: 'disabled',
    message: 'This email is not valid',
    feedbackIcons: {
        valid: 'glyphicon glyphicon-ok',
        invalid: 'glyphicon glyphicon-remove',
        validating: 'glyphicon glyphicon-refresh'
    },
    fields: {
        email: {
            validators: {
                notEmpty: {
                    message: 'The email address is required'
                },
                emailAddress: {
                    message: 'The email address is not valid'
                }
            }
        },
    }
}).on('success.form.bv', function(e) {
    e.preventDefault();
    var email = $("[name='email']").val();
    $.post("http://localhost:8000/reset", {email:email}, function(result) {
      console.log(result);
        if (result.status == "Success") {
          var successAlert = "<div class=\"alert alert-success alert-dismissible\" id=\"messageAlert\">\
<a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">&times;</a>"+result.message+"</div>";
          $("#resetPanel").prepend(successAlert);
        } else {
          var errorAlert = "<div class=\"alert alert-danger alert-dismissible\" id=\"messageAlert\">\
<a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">&times;</a>"+result.message+"</div>";
          $("#resetPanel").prepend(errorAlert);
          $( "[type='submit']" ).prop( "disabled", false );
        }
    });
});

$('#reset-form').bootstrapValidator({
    feedbackIcons: {
        valid: 'glyphicon glyphicon-ok',
        invalid: 'glyphicon glyphicon-remove',
        validating: 'glyphicon glyphicon-refresh'
    },
    fields: {
        newPass: {
            validators: {
                notEmpty: {
                    message: 'You must enter a new password'
                },
                stringLength: {
                  min: 8,
                  max: 16,
                  message: 'Your password must be between 8 and 16 characters'
                }
            }
        },
        retypePass: {
            verbose: false,
            validators: {
                callback: {
                  message: 'Password\'s must match',
                  callback: function(value, validator, $field) {
                    if (value == $("#newPass").val()) {
                      return {
                        valid: true,
                        message: "Passwords match"
                      }
                    } else {
                      return {
                        valid: false,
                        message: "Passwords must match"
                      }
                    }
                  }
                }
            }
        },
    }
}).on('success.form.bv', function(e) {
    e.preventDefault();
    var password = $("[name='newPass']").val();
    $.post("http://localhost:8000/reset", {newPass:password}, function(result) {
      console.log(result);
        if (result.status == "Success") {
          /*var successAlert = "<div class=\"alert alert-success alert-dismissible\" id=\"messageAlert\">\
<a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">&times;</a>"+result.message+"</div>";
          $("#resetPanel").prepend(successAlert);*/
          window.location.assign("/");
        } else {
          var errorAlert = "<div class=\"alert alert-danger alert-dismissible\" id=\"messageAlert\">\
<a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">&times;</a>"+result.Message+"</div>";
          $("#resetPanel").prepend(errorAlert);
        }
    });
});

$('#login-form').bootstrapValidator({
    feedbackIcons: {
        valid: 'glyphicon glyphicon-ok',
        invalid: 'glyphicon glyphicon-remove',
        validating: 'glyphicon glyphicon-refresh'
    },
    fields: {
      email: {
          validators: {
              notEmpty: {
                  message: 'The email address is required'
              },
              emailAddress: {
                  message: 'The email address is not valid'
              }
          }
      },
      password: {
          validators: {
              notEmpty: {
                  message: 'You must enter a password'
              }
          }
      }
    }
}).on('success.form.bv', function(e) {
    e.preventDefault();
    var email = $("[name='email']").val();
    var password = $("[name='password']").val();
    $.post("http://localhost:8000/api/login", {email: email, password: password}, function(result) {
      console.log(result);
      if (result.Success) {
        if (result.reset) {
          window.location.assign('/reset');
        } else {
          window.location.assign('/');
        }
      } else {
        var errorAlert = "<div class=\"alert alert-danger alert-dismissible\" id=\"messageAlert\">\
<a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">&times;</a>"+result.Message+"</div>";
        $("#mainPanel").prepend(errorAlert);

        $("[name='password']").text("");
        $( "[type='submit']" ).prop( "disabled", false );
      }
    });
});
