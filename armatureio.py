import serial
import time
import json

def read_old_json_config(filename):
    rawconfig = None
    with open(filename, "rt") as src:
        rawconfig = json.load(src)
    ret = {}
    for entry in rawconfig:
        mult = float(entry["max"] - entry["min"]) / 1024.0
        offset = float(entry["min"]) + float(entry["offset"])
        chanid = int(entry["chan"])
        jointname = entry["joint"]
        curchan = ArmatureChannel(chanid, mult, offset)
        ret[jointname] = curchan
    return ret

def str_to_hex(s):
    return "".join("{:02x}".format(ord(c)) for c in s)

class ArmatureChannel:
    def __init__(self, chanid, multiplier = 1.0, offset = 0.0):
        self.chanid = chanid
        self.mult = multiplier
        self.offset = offset
        self.rawval = 0
        self.val = self.offset

    def decode_value(self, byte0, byte1):
        self.rawval = byte0 + byte1 * 256
        self.val = float(self.rawval) * self.mult + self.offset
        return self.val

class ArmatureReader:
    def __init__(self, port):
        self.ser = serial.Serial(port = port, baudrate = 115200, timeout = 1)
        self.channels = []
        self.named_joints = {}
        print("Name: %s" % self.ser.name)
        if(self.test_ping()):
            self._write_device_settings()
            print("Successfully wrote settings!")
        else:
            print("Aborted writing settings due to bad ping!")

    def add_named_joints(self, jointdict):
        for (jointname, jointchan) in jointdict.iteritems():
            self.add_named_joint(jointname, jointchan)

    def add_named_joint(self, jointname, channel):
        print("Adding %s <--- %d" % (jointname, channel.chanid))
        self.add_channel(channel)
        self.named_joints[jointname] = channel

    def add_channel(self, c):
        self.channels.append(c)

    def _request_channel(self, chanid):
        self.ser.write("\x03\x50")
        self.ser.write(chr(chanid))

    def read_values(self):
        ntoread = len(self.channels) * 2

        # tell the device about all the channels we want to read
        for chan in self.channels:
            self._request_channel(chan.chanid)

        # read in all the responses
        res = self.ser.read(ntoread)
        byte_res = [ord(c) for c in res]

        # convert all the values
        ret = []
        for (idx, chan) in enumerate(self.channels):
            b0 = byte_res[idx * 2 + 0]
            b1 = byte_res[idx * 2 + 1]
            val = chan.decode_value(b0, b1)
            ret.append(val)

        return ret

    def get_named_joint_values(self):
        return {jname: joint.val for (jname, joint) in self.named_joints.iteritems()}

    def _write_device_settings(self):
        """ Writes some device settings to the IO board
        I'm not exactly sure what they do, but they were part of the c++
        drivers, so I have duplicated them exactly, along with comments
        """

        # Turn on power to pullup pin RB7
        self.ser.write("\x05\x35\x12\x00\x01")

        # Turn on power to pullup pin RB6
        self.ser.write("\x05\x35\x13\x00\x01")

        # Turn on power to pullup pin RA4
        self.ser.write("\x05\x35\x0E\x00\x01")

        # Blink LED to indicate completed configuration
        self.ser.write("\x02\x28")


    def test_ping(self):
        numwritten = self.ser.write("\x02\x27")
        ret = self.ser.read(1)
        if ret == "\x59":
            print("Ping succeeded!")
            return True
        else:
            print("Ping failed: got %s" % str_to_hex(ret))
            return False

    def close(self):
        self.ser.close()
        self.ser = None

def pretty_print_joints(jdict):
    for jname, jval in jdict.iteritems():
        print("%s: %g" % (jname, jval))

if __name__ == '__main__':   
    bla = ArmatureReader("COM3")

    joints = read_old_json_config("arm_config.json")

    bla.add_named_joints(joints)

    for i in range(10):
        vals = bla.read_values()
        nvals = bla.get_named_joint_values()
        pretty_print_joints(nvals)
        #print(nvals["l_arm_elx"])
        #print(nvals)
        #print(vals)
        time.sleep(1)
    #bla.test_ping()
    bla.close()