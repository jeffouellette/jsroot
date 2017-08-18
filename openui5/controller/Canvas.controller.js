sap.ui.define([
   'jquery.sap.global',
	'sap/ui/core/mvc/Controller',
   'sap/ui/model/json/JSONModel',
   'sap/m/MessageToast',
   'sap/m/Dialog',
   'sap/m/List',
   'sap/m/InputListItem',
   'sap/m/Input',
   'sap/m/Button',
   'sap/m/Label',
   'sap/ui/layout/SplitterLayoutData',
   'sap/ui/unified/Menu',
   'sap/ui/unified/MenuItem'

], function (jQuery, Controller, JSONModel, MessageToast, Dialog, List, InputListItem, Input, Button, Label, SplitterLayoutData, Menu, MenuItem) {
	"use strict";

	var CController = Controller.extend("sap.ui.jsroot.controller.Canvas", {
		onInit : function() {
		   this._Page = this.getView().byId("CanvasMainPage");

         var model = new JSONModel({ GedIcon: "" });
         this.getView().setModel(model);

         var canvp = this.getCanvasPainter(true);

         if (canvp) canvp.canvas_controller = this;

		   // this.toggleGedEditor();
		},

		getCanvasPainter : function(also_without_websocket) {
         var elem = this.getView().byId("jsroot_canvas");

         var p = elem ? elem.getController().canvas_painter : null;

         return (p && (p._websocket || also_without_websocket)) ? p : null;
		},

		closeMethodDialog : function(method, call_back) {

         var args = "";

		   if (method) {
		      var cont = this.methodDialog.getContent();

            var items = cont[0].getItems();

		      console.log('ITEMS', method.fArgs.length, items.length);

		      for (var k=0;k<method.fArgs.length;++k) {
		         var arg = method.fArgs[k];
		         var value = items[k].getContent()[0].getValue();

		         if (value==="") value = arg.fDefault;

		         if ((arg.fTitle=="Option_t*") || (arg.fTitle=="const char*")) {
		            // check quotes,
		            // TODO: need to make more precise checking of escape characters
		            if (!value) value = '""';
		            if (value[0]!='"') value = '"' + value;
		            if (value[value.length-1] != '"') value += '"';
		         }

		         args += (k>0 ? "," : "") + value;
		      }
		   }

         this.methodDialog.close();
         this.methodDialog.destroy();
         JSROOT.CallBack(call_back, args);
		},

		showMethodsDialog : function(method, call_back) {
		   var items = [];

         for (var n=0;n<method.fArgs.length;++n) {
            var arg = method.fArgs[n];
            arg.fValue = arg.fDefault;
            if (arg.fValue == '\"\"') arg.fValue = "";
            var item = new InputListItem({
               label: arg.fName + " (" +arg.fTitle + ")",
               content: new Input({ placeholder: arg.fName, value: arg.fValue })
            });
            items.push(item);
         }

         this.methodDialog = new Dialog({
            title: method.fClassName + '::' + method.fName,
            content: new List({
                 items: items
//              items: {
//                 path: '/Method/fArgs',
//                 template: new InputListItem({
//                    label: "{fName} ({fTitle})",
//                    content: new Input({placeholder: "{fName}", value: "{fValue}" })
//                 })
//              }
             }),
             beginButton: new Button({
               text: 'Cancel',
               press: this.closeMethodDialog.bind(this, null, null)
             }),
             endButton: new Button({
               text: 'Ok',
               press: this.closeMethodDialog.bind(this, method, call_back)
             })
         });

         // this.getView().getModel().setProperty("/Method", method);
         //to get access to the global model
         // this.getView().addDependent(this.methodDialog);

         this.methodDialog.open();
		},

		onFileMenuAction : function (oEvent) {
         //var oItem = oEvent.getParameter("item"),
         //    sItemPath = "";
         //while (oItem instanceof sap.m.MenuItem) {
         //   sItemPath = oItem.getText() + " > " + sItemPath;
         //   oItem = oItem.getParent();
         //}
         //sItemPath = sItemPath.substr(0, sItemPath.lastIndexOf(" > "));

		   var p = this.getCanvasPainter();
		   if (!p) return;

		   var name = oEvent.getParameter("item").getText();

         switch (name) {
            case "Close canvas": p.OnWebsocketClosed(); p.CloseWebsocket(true); break;
            case "Interrupt": p.SendWebsocket("INTERRUPT"); break;
            case "Quit ROOT": p.SendWebsocket("QUIT"); break;
            case "Canvas.png":
            case "Canvas.jpeg":
            case "Canvas.svg":
               p.SaveCanvasAsFile(name);
               break;
         }

         MessageToast.show("Action triggered on item: " + name);
		},

		onCloseCanvasPress : function() {
		   var p = this.getCanvasPainter();
         if (p) {
            p.OnWebsocketClosed();
            p.CloseWebsocket(true);
         }
		},

		onInterruptPress : function() {
		   var p = this.getCanvasPainter();
         if (p) p.SendWebsocket("INTERRUPT");
		},

		onQuitRootPress : function() {
		   var p = this.getCanvasPainter();
         if (p) p.SendWebsocket("QUIT");
		},

		ShowCanvasStatus : function (text1,text2,text3,text4) {
		   this.getView().byId("FooterLbl1").setText(text1);
		   this.getView().byId("FooterLbl2").setText(text2);
		   this.getView().byId("FooterLbl3").setText(text3);
		   this.getView().byId("FooterLbl4").setText(text4);
		},

		SelectPainter : function(painter, pnt) {
		   var obj = painter.GetObject();

		   var split = this.getView().byId("MainAreaSplitter");

         if (split) {
	          var area0 = split.getContentAreas()[0];

	          // if (area0) area0.setText("select " + (obj ? obj._typename : painter.GetTipName()));
	       }

         console.log('Select painter', obj ? obj._typename : painter.GetTipName());
		},

		showGeEditor : function(new_state) {
         var current_state = !! this.getView().getModel().getProperty("/GedIcon");

         if (current_state != new_state) this.toggleGedEditor();
		},

		toggleGedEditor : function() {

	      var new_state = ! this.getView().getModel().getProperty("/GedIcon");

         this.getView().getModel().setProperty("/GedIcon", new_state ? "sap-icon://accept" : "");

         var split = this.getView().byId("MainAreaSplitter"),
             p = this.getCanvasPainter(true);

         if (!p || !split) return;

         if (new_state) {
            var oLd = new SplitterLayoutData({
               resizable : true,
               size      : "250px",
               maxSize   : "500px"
            });

            var oContent = sap.ui.xmlview({
               viewName : "sap.ui.jsroot.view.Ged",
               layoutData: oLd
            });

            split.insertContentArea(oContent, 0);

            var ctrl = oContent.getController();
            p.SelectObjectPainter = ctrl.onObjectSelect.bind(ctrl, p);

            ctrl.onObjectSelect(p,p);

         } else {
            split.removeContentArea(split.getContentAreas()[0]);
            delete p.SelectObjectPainter;
         }
		},

		onViewMenuAction : function (oEvent) {
         var p = this.getCanvasPainter(true);
         if (!p) return;

         var item = oEvent.getParameter("item"),
             name = item.getText();

         var new_state = !item.getIcon();

         switch (name) {
            case "Editor":
               this.toggleGedEditor();
               return;
            case "Toolbar":
               this._Page.setShowSubHeader(new_state)
               break;
            case "Event statusbar":
               this._Page.setShowFooter(new_state);
               if (new_state) {
                  p.ShowStatus = this.ShowCanvasStatus.bind(this);
               } else {
                  delete p.ShowStatus;
               }
               break;
            case "Tooltip info": p.SetTooltipAllowed(new_state); break;
            default: return;
         }

         item.setIcon(new_state ? "sap-icon://accept" : "");

         // MessageToast.show("Action triggered on item: " + name);
		}

	});


	return CController;

});
