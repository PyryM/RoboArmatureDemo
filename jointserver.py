from autobahn.twisted.websocket import WebSocketServerProtocol, \
                                                    WebSocketServerFactory

import armatureio
import json

g_armature = None

class MyServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        global g_armature

        g_armature.read_values()
        jointstate = g_armature.get_named_joint_values()

        # Ignore message and just send back joints
        jointmsg = json.dumps(jointstate)

        ## echo back message verbatim
        self.sendMessage(jointmsg, False)

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))



if __name__ == '__main__':
    global g_armature

    import sys

    from twisted.python import log
    from twisted.internet import reactor

    log.startLogging(sys.stdout)

    g_armature = armatureio.ArmatureReader("COM3")
    joints = armatureio.read_old_json_config("arm_config.json")
    g_armature.add_named_joints(joints)

    factory = WebSocketServerFactory("ws://localhost:9000", debug = False)
    factory.protocol = MyServerProtocol

    reactor.listenTCP(9000, factory)
    reactor.run()